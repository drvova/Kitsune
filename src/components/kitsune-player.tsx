"use client";

import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  HTMLAttributes,
} from "react";
import Artplayer from "artplayer";
import type Option from "artplayer/types/option";
import Hls from "hls.js";


// Helper functions and types (keep or import from your types file)
import { IEpisodeServers, IEpisodeSource, IEpisodes } from "@/types/episodes"; // Adjust path as needed
import loadingImage from "@/assets/genkai.gif"; // Adjust path as needed
import artplayerPluginHlsControl from "artplayer-plugin-hls-control";
import artplayerPluginAmbilight from "artplayer-plugin-ambilight";
import { env } from "next-runtime-env"; // Ensure this works in client components or pass env vars differently
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import useBookMarks from "@/hooks/use-get-bookmark";
import Image from "next/image";

const WATCH_PROGRESS_UPDATE_INTERVAL = 10000; // Update every 10 seconds
const WATCH_PROGRESS_MIN_WATCH_TIME = 10; // Min seconds watched to create record

// --- Define Props for the Combined Player ---
interface ArtPlayerProps extends HTMLAttributes<HTMLDivElement> {
  episodeInfo: IEpisodeSource; // Source info including URLs, tracks, intro/outro
  animeInfo: { title: string; image: string; id: string }; // Basic anime info for poster etc.
  subOrDub: "sub" | "dub"; // Use literal type for clarity
  episodes?: IEpisodes; // Optional: If needed for playlist features later
  getInstance?: (art: Artplayer) => void; // Callback to get the instance
  autoSkip?: boolean;
  serversData: IEpisodeServers;
}

// --- Helper to generate highlights ---
interface HighlightPoint {
  time: number;
  text: string;
}
const generateHighlights = (
  start: number | undefined | null,
  end: number | undefined | null,
  label: string,
): HighlightPoint[] => {
  if (start == null || end == null || start >= end) return []; // Use >= to avoid single-second highlights
  const highlights: HighlightPoint[] = [];
  for (let time = Math.floor(start); time <= Math.floor(end); time++) {
    highlights.push({ time, text: label });
  }
  return highlights;
};

// --- The Combined ArtPlayer Component ---
function KitsunePlayer({
  episodeInfo,
  animeInfo,
  subOrDub,
  getInstance,
  autoSkip = true,
  serversData,
  ...rest // Spread other div attributes like className, id, etc.
}: ArtPlayerProps): JSX.Element {
  const artContainerRef = useRef<HTMLDivElement>(null); // Ref for the mounting div
  const artInstanceRef = useRef<Artplayer | null>(null); // Ref for the ArtPlayer instance
  const hlsInstanceRef = useRef<Hls | null>(null); // Ref for the Hls.js instance

  // State only needed for the current auto-skip setting
  const [isAutoSkipEnabled, setIsAutoSkipEnabled] = useState(autoSkip);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [isCleanupInProgress, setIsCleanupInProgress] = useState(false);

  const bookmarkIdRef = useRef<string | null>(null);
  const watchHistoryIdsRef = useRef<string[]>([]); // Store initial list
  const watchedRecordIdRef = useRef<string | null>(null);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const hasMetMinWatchTimeRef = useRef<boolean>(false); // Track if min time met for this episode
  const initialSeekTimeRef = useRef<number | null>(null);

  const { auth } = useAuthStore();
  const { createOrUpdateBookMark, syncWatchProgress } = useBookMarks({
    populate: false,
  });

  useEffect(() => {
    setIsAutoSkipEnabled(autoSkip);
  }, [autoSkip]);

  const proxyBaseURI = `${env("NEXT_PUBLIC_PROXY_URL")}/m3u8-proxy`;

  // --- Construct Proxy URI ---
  const uri = useMemo(() => {
    const firstSourceUrl = episodeInfo?.sources?.[0]?.url;
    const referer = episodeInfo?.headers?.Referer;
    if (!firstSourceUrl || !referer) return null;

    try {
      const params = new URLSearchParams();
      params.append("url", firstSourceUrl);
      params.append("referer", referer);

      return `${proxyBaseURI}?${params.toString()}`;
    } catch (error) {
      console.error("Error constructing proxy URI:", error);
      return null;
    }
  }, [episodeInfo, proxyBaseURI]);

  const skipTimesRef = useRef<{
    introStart?: number;
    introEnd?: number;
    validIntro: boolean;
    outroStart?: number;
    outroEnd?: number;
    validOutro: boolean;
  }>({ validIntro: false, validOutro: false });

  useEffect(() => {
    if (!auth || !animeInfo.id || !serversData.episodeId) {
      // Reset refs if critical info is missing
      bookmarkIdRef.current = null;
      watchedRecordIdRef.current = null;
      watchHistoryIdsRef.current = [];
      hasMetMinWatchTimeRef.current = false;
      initialSeekTimeRef.current = null;
      return;
    }

    let isMounted = true; // Track mount status for async operations

    const fetchBookmarkAndWatchedId = async () => {
      const id = await createOrUpdateBookMark(
        animeInfo.id,
        animeInfo.title,
        animeInfo.image,
        "watching",
        false,
      );

      if (!isMounted || !id) {
        bookmarkIdRef.current = null; // Clear if failed or unmounted
        watchedRecordIdRef.current = null;
        watchHistoryIdsRef.current = [];
        initialSeekTimeRef.current = null;
        hasMetMinWatchTimeRef.current = false;
        return;
      }

      bookmarkIdRef.current = id;
      hasMetMinWatchTimeRef.current = false; // Reset min watch time check

      // Now find the specific watched record ID for THIS episode
      // Get watch history from localStorage
      try {
        const allWatchHistory = JSON.parse(localStorage.getItem('kitsune_watch_history') || '[]');
        const episodeHistory = allWatchHistory.find((h: any) => 
          h.id === id && h.episodeId === serversData.episodeId
        );

        if (!isMounted) return;

        const existingWatched = episodeHistory;

        if (existingWatched) {
          watchedRecordIdRef.current = existingWatched.id;
          initialSeekTimeRef.current =
            typeof existingWatched.current === "number"
              ? existingWatched.current
              : null;
          hasMetMinWatchTimeRef.current =
            initialSeekTimeRef.current !== null &&
            initialSeekTimeRef.current >= WATCH_PROGRESS_MIN_WATCH_TIME;
        } else {
          watchedRecordIdRef.current = null; // Explicitly set to null
          initialSeekTimeRef.current = null; // Ensure it's null if no record
          hasMetMinWatchTimeRef.current = false;
        }
      } catch (e) {
        console.error("Error fetching bookmark watch history:", e);
        if (!isMounted) return;
        // Keep bookmarkId, but assume no watched record found
        watchedRecordIdRef.current = null;
        initialSeekTimeRef.current = null; // Ensure it's null if no record
        hasMetMinWatchTimeRef.current = false;
      }
    };

    fetchBookmarkAndWatchedId();

    return () => {
      isMounted = false; // Cleanup flag
      // Optional: Clear refs on unmount? Or rely on fetch logic?
      // bookmarkIdRef.current = null;
      // watchedRecordIdRef.current = null;
    };
  }, [
    auth,
    animeInfo.id,
    animeInfo.title,
    animeInfo.image,
    serversData.episodeId,
    createOrUpdateBookMark,
  ]);

  // --- Effect for Player Initialization and Cleanup ---
  useEffect(() => {
    // Wait for container ref and valid URI
    if (!artContainerRef.current || !uri) {
      // Clean up previous instances if URI becomes invalid or ref detach
      if (hlsInstanceRef.current && !isCleanupInProgress) {
        try {
          hlsInstanceRef.current.stopLoad();
          if (hlsInstanceRef.current.media) {
            hlsInstanceRef.current.detachMedia();
          }
          hlsInstanceRef.current.destroy();
        } catch (error) {
          console.warn("Error cleaning up HLS instance in URI check:", error);
        }
        hlsInstanceRef.current = null;
      }
      if (artInstanceRef.current && !isCleanupInProgress) {
        try {
          artInstanceRef.current.pause();
          if (artInstanceRef.current.video) {
            artInstanceRef.current.video.removeAttribute("src");
            artInstanceRef.current.video.src = '';
            artInstanceRef.current.video.load();
          }
          artInstanceRef.current.destroy(true);
        } catch (error) {
          console.warn("Error cleaning up ArtPlayer instance in URI check:", error);
        }
        artInstanceRef.current = null;
      }
      return;
    }

    // Make sure start/end are valid numbers before creating range
    const introStart = episodeInfo?.intro?.start;
    const introEnd = episodeInfo?.intro?.end;
    skipTimesRef.current.validIntro =
      typeof introStart === "number" &&
      typeof introEnd === "number" &&
      introStart < introEnd;
    skipTimesRef.current.introStart = introStart;
    skipTimesRef.current.introEnd = introEnd;

    const outroStart = episodeInfo?.outro?.start;
    const outroEnd = episodeInfo?.outro?.end; // Use let for potential modification
    skipTimesRef.current.validOutro =
      typeof outroStart === "number" &&
      typeof outroEnd === "number" &&
      outroStart < outroEnd; // Adjust condition if needed
    skipTimesRef.current.outroStart = outroStart;
    skipTimesRef.current.outroEnd = outroEnd; // Store the raw value

    // Subtitle Track Selector Options
    const trackOptions: any = (episodeInfo?.tracks ?? []).map((track) => ({
      default: track.lang === "English", // Example default logic
      html: track.lang,
      url: `${proxyBaseURI}?url=${encodeURIComponent(track.url)}`,
    }));

    const defaultTrack = episodeInfo?.tracks?.find(
      (track) => track.lang === "English",
    )?.url;

    // Direct Subtitle Option based on subOrDub
    const subtitleConfig: Option["subtitle"] =
      subOrDub === "sub"
        ? {
            url: `${
              defaultTrack
                ? `${proxyBaseURI}?url=${encodeURIComponent(defaultTrack)}`
                : ""
            }`,
            type: "vtt",
            style: {
              // Example styles
              color: "#FFFFFF",
              fontSize: "22px", // Base size, will be adjusted
              textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
            },
            encoding: "utf-8",
            escape: false, // Allow potential styling tags in VTT
          }
        : {}; // Explicitly hide if 'dub'

    const manualSkipControl = {
      name: "manual-skip", // Unique name
      position: "right", // Place near other controls
      html: `
                <div style="display: flex; align-items: center; gap: 4px; padding: 0 6px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" x2="19" y1="5" y2="19"/></svg>
                    <span class="art-skip-text">Skip</span>
                </div>
            `, // Icon + Text (use a class for text if needed)
      tooltip: "Skip", // Initial tooltip
      style: {
        display: "none", // Start hidden
        cursor: "pointer",
        borderRadius: "4px",
        marginRight: "10px", // Space from toggle
        padding: "3px 0", // Adjust padding for vertical centering
      },
      click: function (controlItem: any) {
        const art = artInstanceRef.current;
        if (!art) return;
        const { introEnd, outroStart, outroEnd, validIntro, validOutro } =
          skipTimesRef.current;
        const currentTime = art.currentTime;
        const duration = art.duration;

        let seekTarget: number | null = null;
        const resolvedOutroEnd =
          validOutro && outroEnd === 0 && duration > 0 ? duration : outroEnd;

        if (
          validIntro &&
          typeof introEnd === "number" &&
          currentTime >= skipTimesRef.current.introStart! &&
          currentTime < introEnd
        ) {
          seekTarget = introEnd;
        } else if (
          validOutro &&
          typeof outroStart === "number" &&
          typeof resolvedOutroEnd === "number" &&
          currentTime >= outroStart &&
          currentTime < resolvedOutroEnd
        ) {
          // Seek slightly before end if target is duration
          seekTarget =
            resolvedOutroEnd === duration ? duration - 0.1 : resolvedOutroEnd;
        }

        if (typeof seekTarget === "number") {
          art.seek = Math.min(seekTarget, duration); // Seek
        }

        // Hide the button immediately after click
        if (controlItem.style) controlItem.style.display = "none";
      },
    };

    let currentHlsInstanceForCleanup: Hls | null = null;

    // Combine All Options
    const finalOptions: Option = {
      container: artContainerRef.current,
      url: uri,
      type: "m3u8", // Explicitly set type for HLS
      customType: {
        m3u8: (
          videoElement: HTMLMediaElement,
          url: string,
          artPlayerInstance: Artplayer,
        ) => {
          if (Hls.isSupported()) {
            setIsMediaLoading(true);
            // Destroy previous HLS instance if attached to this player
            if (hlsInstanceRef.current) {
              try {
                hlsInstanceRef.current.destroy();
              } catch (error) {
                console.warn("Error destroying previous HLS instance:", error);
              }
            }
            const hls = new Hls({
              // Enable web worker for better performance
              enableWorker: true,

              // Low latency mode OFF for better stability
              lowLatencyMode: false,

              // OPTIMIZED BUFFER SETTINGS - Reduced for faster startup
              maxBufferLength: 10,              // Reduced from 30 - buffer 10s ahead (was causing slow startup)
              maxMaxBufferLength: 30,           // Reduced from 600 - max 30s buffer
              maxBufferSize: 20 * 1000 * 1000,  // Reduced from 60MB to 20MB
              maxBufferHole: 0.5,               // Jump over 0.5s gaps
              backBufferLength: 30,             // Reduced from 90 - keep 30s behind

              // PROGRESSIVE LOADING - Start playback quickly
              startLevel: -1,                   // Auto quality selection

              // RETRY CONFIGURATION - Balanced for reliability
              fragLoadingMaxRetry: 3,           // Reduced from 6 - fail faster
              fragLoadingMaxRetryTimeout: 10000, // Reduced from 64s to 10s
              fragLoadingRetryDelay: 500,       // Reduced from 1s to 0.5s

              levelLoadingMaxRetry: 3,          // Reduced from 4
              levelLoadingMaxRetryTimeout: 10000, // Reduced from 64s
              levelLoadingRetryDelay: 500,

              manifestLoadingMaxRetry: 3,       // Reduced from 6
              manifestLoadingMaxRetryTimeout: 10000, // Reduced from 64s
              manifestLoadingRetryDelay: 500,

              // LIVE SYNC - Better handling of live streams
              liveSyncDurationCount: 3,
              liveMaxLatencyDurationCount: 10,

              // ABR (Adaptive Bitrate) - Faster quality switching
              abrEwmaDefaultEstimate: 500000,   // 500kbps initial estimate
              abrBandWidthFactor: 0.95,         // Use 95% of measured bandwidth
              abrBandWidthUpFactor: 0.7,        // Faster quality increases
            });

            // Track consecutive errors to prevent spam
            let consecutiveErrors = 0;
            const MAX_CONSECUTIVE_ERRORS = 10;
            let lastErrorTime = 0;
            const ERROR_THROTTLE_MS = 1000;

            // Add error handling with intelligent recovery
            hls.on(Hls.Events.ERROR, (event, data) => {
              const now = Date.now();

              // Only log fatal errors or throttled non-fatal errors
              if (data.fatal) {
                console.error("HLS.js Fatal Error:", {
                  type: data.type,
                  details: data.details,
                  reason: data.reason,
                });

                consecutiveErrors++;

                if (consecutiveErrors > MAX_CONSECUTIVE_ERRORS) {
                  console.error("Too many consecutive errors, stopping recovery attempts");
                  artPlayerInstance.notice.show = "Video stream error. Please try another server.";
                  return;
                }

                // Attempt recovery based on error type
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.log("Network error, attempting to recover...");
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.log("Media error, attempting to recover...");
                    hls.recoverMediaError();
                    break;
                  default:
                    console.log("Unrecoverable fatal error");
                    artPlayerInstance.notice.show = "Playback error. Please refresh or try another server.";
                    break;
                }
              } else {
                // Non-fatal errors - only log throttled
                if (now - lastErrorTime > ERROR_THROTTLE_MS) {
                  // Only log specific non-fatal errors that matter
                  if (data.details === 'bufferStalledError' ||
                      data.details === 'bufferNudgeOnStall' ||
                      data.details === 'bufferSeekOverHole') {
                    console.warn("HLS.js Non-Fatal Error (throttled):", data.details);
                  }
                  // Silently ignore fragParsingError and other recoverable errors
                  lastErrorTime = now;
                }
              }
            });

            // Reset error counter on successful fragment load
            hls.on(Hls.Events.FRAG_LOADED, () => {
              consecutiveErrors = 0;
            });
            
            // Add load success handler
            hls.on(Hls.Events.MANIFEST_LOADED, () => {
              console.log("HLS manifest loaded successfully");
              setIsMediaLoading(false);
            });
            
            hls.loadSource(url);
            hls.attachMedia(videoElement);
            hlsInstanceRef.current = hls; // Store ref
            currentHlsInstanceForCleanup = hls; // Store for cleanup
            
            // Attach HLS instance to ArtPlayer for plugins
            art.hls = hls;
            // Make sure HLS instance is destroyed when ArtPlayer instance is destroyed
            artPlayerInstance.on("destroy", () => {
              if (hlsInstanceRef.current === hls && !isCleanupInProgress) {
                // Check if it's the same instance and cleanup not in progress
                try {
                  hls.destroy();
                  hlsInstanceRef.current = null;
                  art.hls = undefined; // Remove HLS reference from ArtPlayer
                  currentHlsInstanceForCleanup = null;
                  console.log(
                    "HLS instance destroyed via ArtPlayer destroy event.",
                  );
                } catch (error) {
                  console.warn("Error destroying HLS instance in ArtPlayer destroy:", error);
                }
              }
            });
          } else if (
            videoElement.canPlayType("application/vnd.apple.mpegurl")
          ) {
            setIsMediaLoading(true);
            videoElement.src = url; // Fallback for Safari native HLS
            videoElement.addEventListener('loadedmetadata', () => {
              setIsMediaLoading(false);
            }, { once: true });
          } else {
            artPlayerInstance.notice.show =
              "HLS playback is not supported on your browser.";
          }
        },
      },
      plugins: [
        artplayerPluginHlsControl({
          // Configure HLS controls
          quality: {
            control: true,
            setting: true,
            getName: (level: { height?: number; bitrate?: number }) =>
              level.height ? `${level.height}P` : "Auto", // Type level
            title: "Quality",
            auto: "Auto",
          },
          audio: {
            control: true,
            setting: true,
            getName: (track: { name?: string }) => track.name ?? "Unknown", // Type track
            title: "Audio",
            auto: "Auto",
          },
        }),
        artplayerPluginAmbilight({
          // Configure Ambilight
          blur: "30", // Use numbers
          opacity: 0.8,
          frequency: 10,
          duration: 0.3,
          zIndex: -1,
        }),
      ],
      settings: [
        // Configure settings panel items
        {
          width: 250,
          html: "Subtitle",
          tooltip: "Subtitle",
          selector: [
            {
              html: "Display",
              tooltip: subOrDub === "sub" ? "Hide" : "Show", // Initial state based on prop
              switch: subOrDub === "sub", // Switch is ON if sub
              onSwitch: function (item) {
                const showSubtitle = !item.switch; // The new state
                art.subtitle.show = showSubtitle;
                item.tooltip = showSubtitle ? "Hide" : "Show";
                console.log(`Subtitle display set to: ${showSubtitle}`);
                return showSubtitle; // Return the new switch state
              },
            },
            ...trackOptions, // Add subtitle track choices
          ],
          onSelect: function (item: any) {
            // Type the item
            if (item.url && typeof item.url === "string") {
              art.subtitle.switch(`${proxyBaseURI}?url=${item.url}`, {
                name: item.html,
              });
              return item.html ?? "Subtitle";
            }
            return item.html ?? "Subtitle"; // Return name for display
          },
        },
      ],
      controls: [manualSkipControl],
      highlight: [
        ...generateHighlights(
          episodeInfo?.intro?.start,
          episodeInfo?.intro?.end,
          "Intro",
        ),
        ...generateHighlights(
          episodeInfo?.outro?.start,
          episodeInfo?.outro?.end,
          "Outro",
        ),
      ],
      poster: animeInfo.image,
      volume: 0.8,
      isLive: false,
      muted: false,
      autoplay: false,
      autoOrientation: true,
      pip: true,
      autoSize: false,
      autoMini: false,
      screenshot: true,
      setting: true,
      loop: false,
      flip: false,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: true,
      miniProgressBar: false,
      mutex: true,
      backdrop: true,
      playsInline: true,
      autoPlayback: true,
      airplay: true,
      theme: "#F5316F",
      moreVideoAttr: { crossOrigin: "anonymous" },
      subtitle: subtitleConfig,
      icons: {
        loading: `<img width="60" height="60" src="${loadingImage.src}">`,
      },
    };

    // --- Initialize ArtPlayer ---
    const art = new Artplayer(finalOptions);
    artInstanceRef.current = art;

    // --- Skip Logic Handler ---
    const handleTimeUpdate = () => {
      const art = artInstanceRef.current;
      if (!art || art.loading.show) return;

      const currentTime = art.currentTime;
      const duration = art.duration;
      const {
        introStart,
        introEnd,
        validIntro,
        outroStart,
        outroEnd,
        validOutro,
      } = skipTimesRef.current; // Use ref

      const resolvedOutroEnd =
        validOutro && outroEnd === 0 && duration > 0 ? duration : outroEnd;
      const inIntro =
        validIntro &&
        typeof introStart === "number" &&
        typeof introEnd === "number" &&
        currentTime >= introStart &&
        currentTime < introEnd;
      const inOutro =
        validOutro &&
        typeof outroStart === "number" &&
        typeof resolvedOutroEnd === "number" &&
        currentTime >= outroStart &&
        currentTime < resolvedOutroEnd;

      // Get the manual skip control instance *once* per update
      const manualSkip = art.controls["manual-skip"]; // Access by name

      if (isAutoSkipEnabled) {
        // Auto Skip Logic
        if (manualSkip?.style?.display !== "none") {
          // Ensure manual button is hidden
          if (manualSkip.style) manualSkip.style.display = "none";
        }
        if (inIntro && typeof introEnd === "number") {
          art.seek = introEnd;
        } else if (inOutro && typeof resolvedOutroEnd === "number") {
          const seekTarget =
            resolvedOutroEnd === duration ? duration - 0.1 : resolvedOutroEnd;
          art.seek = Math.min(seekTarget, duration);
        }
      } else {
        // Manual Skip Button Logic
        if (!manualSkip) return; // Guard if control not found

        if (inIntro || inOutro) {
          // Show the button
          if (manualSkip.style?.display === "none") {
            if (manualSkip.style) manualSkip.style.display = "inline-flex";
          }
          // Update text/tooltip
          const skipText = inIntro ? "Intro" : "Outro";
          // Update HTML text if needed (more complex, might need querySelector)
          const textElement = manualSkip.querySelector(".art-skip-text");
          if (textElement && textElement.textContent !== `Skip ${skipText}`) {
            textElement.textContent = `Skip ${skipText}`;
          }
        } else {
          // Hide the button
          if (manualSkip.style?.display !== "none") {
            if (manualSkip.style) manualSkip.style.display = "none";
          }
        }
      }

      // --- Watch Progress Tracking ---
      // 1. Check if minimum watch time is met to potentially create record
      if (
        !hasMetMinWatchTimeRef.current &&
        currentTime >= WATCH_PROGRESS_MIN_WATCH_TIME
      ) {
        console.log("Minimum watch time met.");
        hasMetMinWatchTimeRef.current = true;
        // Immediately sync progress if min time just met and no record exists
        if (!watchedRecordIdRef.current) {
          console.log("Triggering initial sync after min watch time.");
          syncWatchProgress(
            bookmarkIdRef.current,
            null, // Force creation attempt
            {
              episodeId: serversData.episodeId,
              episodeNumber: parseInt(serversData.episodeNo),
              current: currentTime,
              duration: duration,
            },
          ).then((newId) => {
            if (newId) {
              watchedRecordIdRef.current = newId;
              watchHistoryIdsRef.current.push(newId);
            }
          });
          lastUpdateTimeRef.current = Date.now(); // Prevent immediate throttled update
        }
      }

      // 2. Throttle updates if playing and min time met OR record already exists
      if (
        (hasMetMinWatchTimeRef.current || watchedRecordIdRef.current) &&
        Date.now() - lastUpdateTimeRef.current > WATCH_PROGRESS_UPDATE_INTERVAL
      ) {
        // Call sync directly now, timer approach less reliable with state/refs
        // console.log("Updating progress via interval check")
        syncWatchProgress(bookmarkIdRef.current, watchedRecordIdRef.current, {
          episodeId: serversData.episodeId,
          episodeNumber: parseInt(serversData.episodeNo),
          current: currentTime,
          duration: duration,
        }).then((id) => {
          if (id) watchedRecordIdRef.current = id; // Update ref just in case
        });
        lastUpdateTimeRef.current = Date.now(); // Reset timer
      }
    };

    // --- Event Listeners ---
    art.on("ready", () => {
      console.log("ArtPlayer ready. Duration:", art.duration);
      // Adjust subtitle size initially
      art.subtitle.style({
        fontSize: art.height * 0.04 + "px", // Adjust multiplier as needed
      });
      // --- SEEK TO LAST POSITION ---
      const seekTime = initialSeekTimeRef.current;
      // Check if seekTime is a valid number, greater than 0,
      // and less than the duration (minus a small buffer like 5s to avoid seeking to the very end)
      if (
        seekTime !== null &&
        seekTime > 0 &&
        art.duration > 0 &&
        seekTime < art.duration - 5
      ) {
        console.log(`Player ready, seeking to initial timestamp: ${seekTime}`);
        // Optional: Add a very small delay for HLS stability if needed
        setTimeout(() => {
          if (artInstanceRef.current) {
            // Check if instance still exists
            artInstanceRef.current.seek = seekTime;
          }
        }, 100);
        initialSeekTimeRef.current = null;
      } else {
        console.log(
          "Player ready, not seeking (no valid initial time found or near end).",
        );
        initialSeekTimeRef.current = null; // Clear ref even if not seeking
      }
    });

    art.on("resize", () => {
      if (!artInstanceRef.current) return; // Guard against destroyed instance
      // Clamp font size between reasonable min/max values
      const newSize = Math.max(
        14,
        Math.min(32, artInstanceRef.current.height * 0.04),
      );
      artInstanceRef.current.subtitle.style({ fontSize: `${newSize}px` });
    });

    art.on("error", (error, reconnectTime) => {
      console.error(
        "ArtPlayer Error:",
        error,
        "Reconnect attempt:",
        reconnectTime,
      );
      // Optionally show a user-friendly message
      if (artInstanceRef.current) {
        artInstanceRef.current.notice.show = `Error: ${error.message || "Playback failed"}`;
      }
    });

    art.on("video:timeupdate", handleTimeUpdate);

    const handleInteractionUpdate = () => {
      const art = artInstanceRef.current;
      if (!art || !art.duration || art.duration <= 0) return;
      // Only update if min time met or record exists
      if (hasMetMinWatchTimeRef.current || watchedRecordIdRef.current) {
        console.log("Syncing progress on pause/seek.");
        // Clear any pending throttled update
        if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
        syncWatchProgress(bookmarkIdRef.current, watchedRecordIdRef.current, {
          episodeId: serversData.episodeId,
          episodeNumber: parseInt(serversData.episodeNo),
          current: art.currentTime,
          duration: art.duration,
        }).then((id) => {
          if (id) watchedRecordIdRef.current = id;
        });
        lastUpdateTimeRef.current = Date.now();
      }
    };
    art.on("video:pause", handleInteractionUpdate);
    art.on("video:seeked", handleInteractionUpdate);

    // --- Callback for Parent ---
    if (getInstance && typeof getInstance === "function") {
      getInstance(art);
    }

    // --- Async Cleanup Function ---
    const cleanupPlayer = async () => {
      if (isCleanupInProgress) return;
      setIsCleanupInProgress(true);
      
      console.log(
        "Running cleanup for ArtPlayer instance:",
        artInstanceRef.current?.id,
      );

      const art = artInstanceRef.current; // Get instance ref
      const hls = hlsInstanceRef.current; // Get HLS ref

      try {
        // Wait for media loading to complete before cleanup
        if (isMediaLoading) {
          console.log("Waiting for media loading to complete before cleanup...");
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Sync final progress before destroying anything
        if (
          art &&
          art.duration > 0 &&
          (hasMetMinWatchTimeRef.current || watchedRecordIdRef.current)
        ) {
          console.log("Syncing final progress on unmount.");
          try {
            await syncWatchProgress(bookmarkIdRef.current, watchedRecordIdRef.current, {
              episodeId: serversData.episodeId,
              episodeNumber: parseInt(serversData.episodeNo),
              current: art.currentTime,
              duration: art.duration,
            });
          } catch (error) {
            console.warn("Error syncing final progress:", error);
          }
        }

        // Clear throttle timer
        if (updateTimerRef.current) {
          clearTimeout(updateTimerRef.current);
          updateTimerRef.current = null;
        }

        if (art) {
          console.log("Cleanup: Preparing to destroy ArtPlayer instance.");
          
          // Remove event listeners first
          art.off("video:pause", handleInteractionUpdate);
          art.off("video:seeked", handleInteractionUpdate);
          art.off("video:timeupdate", handleTimeUpdate);

          // Pause the player
          try {
            console.log("Cleanup: Pausing player");
            art.pause();
          } catch (error) {
            console.warn("Error pausing player during cleanup:", error);
          }

          // Handle video element cleanup
          if (art.video) {
            try {
              console.log("Cleanup: Cleaning up video element");
              // Pause video element directly
              art.video.pause();
              // Remove source
              art.video.removeAttribute("src");
              art.video.src = '';
              // Load empty source to reset state
              art.video.load();
            } catch (error) {
              console.warn("Error cleaning up video element:", error);
            }
          }

          // Handle HLS cleanup with proper error handling
          if (hls && hlsInstanceRef.current === hls) {
            try {
              console.log("Cleanup: Destroying HLS instance");
              // Stop any pending loads
              hls.stopLoad();
              // Detach media if attached
              if (hls.media) {
                hls.detachMedia();
              }
              // Destroy HLS instance
              hls.destroy();
            } catch (error) {
              console.warn("Error destroying HLS instance:", error);
            } finally {
              hlsInstanceRef.current = null;
              art.hls = undefined;
            }
          }

          // Handle cleanup-specific HLS instance
          if (currentHlsInstanceForCleanup && currentHlsInstanceForCleanup !== hls) {
            try {
              console.log("Cleanup: Destroying currentHlsInstanceForCleanup");
              currentHlsInstanceForCleanup.stopLoad();
              if (currentHlsInstanceForCleanup.media) {
                currentHlsInstanceForCleanup.detachMedia();
              }
              currentHlsInstanceForCleanup.destroy();
            } catch (error) {
              console.warn("Error destroying currentHlsInstanceForCleanup:", error);
            } finally {
              currentHlsInstanceForCleanup = null;
            }
          }

          // Finally destroy ArtPlayer instance
          try {
            console.log("Cleanup: Destroying ArtPlayer instance");
            art.destroy(true);
          } catch (error) {
            console.warn("Error destroying ArtPlayer instance:", error);
          } finally {
            if (artInstanceRef.current === art) {
              artInstanceRef.current = null;
            }
          }
        }
      } catch (error) {
        console.error("Unexpected error during cleanup:", error);
      } finally {
        setIsCleanupInProgress(false);
        console.log("Cleanup completed");
      }
    };

    return () => {
      cleanupPlayer().catch(error => {
        console.error("Cleanup function failed:", error);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri, episodeInfo, animeInfo, subOrDub, getInstance, autoSkip]);

  // --- Render ---
  return (
    <div
      data-testid="video-player"
      className={cn(
        "relative w-full h-auto aspect-video  min-h-[20vh] sm:min-h-[30vh] md:min-h-[40vh] lg:min-h-[60vh] max-h-[500px] lg:max-h-[calc(100vh-150px)] bg-black overflow-hidden", // Added relative and overflow-hidden
        rest.className ?? "",
      )}
    >
      <div ref={artContainerRef} className="w-full h-full">
        {!uri && (
          <div
            className="w-full h-full flex items-center justify-center bg-cover bg-center"
            style={{ backgroundImage: `url(${animeInfo.image})` }}
          >
            <Image
              width="60"
              height="60"
              src={loadingImage.src}
              alt="Loading..."
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default KitsunePlayer;
