import React, { useEffect, useState } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import styles from "../heatmap.module.css";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { Tooltip } from "react-tooltip";

type HeatmapValue = {
  date: string;
  count: number;
};

export type BookmarkData = {
  watchHistory: string[];
};

function AnimeHeatmap() {
  const { auth } = useAuthStore();
  const [heatmapData, setHeatmapData] = useState<HeatmapValue[]>([]);
  const [totalContributionCount, setTotalContributionCount] =
    useState<number>(0);

  const startDate = new Date(new Date().setMonth(0, 1));
  const endDate = new Date(new Date().setMonth(11, 31));

  // --- Data Fetching and Aggregation ---
  const fetchAndAggregateWatchHistory = async () => {
    if (!auth?.id) return; // Need authenticated user ID

    try {
      // 1. Get all bookmarks and watch history for the user from localStorage
      const bookmarks = JSON.parse(localStorage.getItem('kitsune_bookmarks') || '[]');
      const userBookmarks = bookmarks.filter((b: any) => b.user === auth.id);
      
      if (!userBookmarks || userBookmarks.length === 0) {
        console.log("No bookmarks found for user.");
        setHeatmapData([]);
        setTotalContributionCount(0);
        return;
      }

      // 2. Get all watch history records
      const allWatchHistory = JSON.parse(localStorage.getItem('kitsune_watch_history') || '[]');
      const userWatchHistory = allWatchHistory.filter((h: any) => 
        userBookmarks.some((b: any) => b.id === h.id)
      );

      // 3. Process watch history to create heatmap data
      const dailyCounts: { [key: string]: number } = {};
      let totalCount = 0;

      userWatchHistory.forEach((record: any) => {
        if (record.created) {
          const dateStr = record.created.substring(0, 10); // Extracts "YYYY-MM-DD"

          if (dailyCounts[dateStr]) {
            dailyCounts[dateStr] += 1;
          } else {
            dailyCounts[dateStr] = 1;
          }
          totalCount += 1;
        }
      });

      const formattedData = Object.entries(dailyCounts).map(
        ([date, count]) => ({
          date,
          count,
        }),
      );

      setHeatmapData(formattedData);
      setTotalContributionCount(totalCount);
    } catch (error) {
      console.error("Error fetching or aggregating watch history:", error);
      toast.error("Failed to load watch activity.");
      setHeatmapData([]); // Clear data on error
      setTotalContributionCount(0);
    }
  };

  useEffect(() => {
    if (!auth?.id) return; // Need authenticated user ID
    fetchAndAggregateWatchHistory();
  }, []);

  const getClassForValue = (value: HeatmapValue | null): string => {
    if (!value || value.count === 0) {
      return styles.colorEmpty;
    }
    if (value.count >= 10) {
      return styles.colorScale4;
    }
    if (value.count >= 5) {
      return styles.colorScale3;
    }
    if (value.count >= 2) {
      return styles.colorScale2;
    }
    if (value.count >= 1) {
      return styles.colorScale1;
    }
    return styles.colorEmpty;
  };

  const getTooltipContent = (
    value: HeatmapValue | null,
  ): Record<string, string> => {
    const val = value as HeatmapValue;
    if (!val.date) {
      return {
        "data-tooltip-id": "heatmap-tooltip",
        "data-tooltip-content": "No episodes watched",
      };
    }
    const formatedDate = new Date(val.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return {
      "data-tooltip-id": "heatmap-tooltip",
      "data-tooltip-content": `Watched ${val.count} episodes on ${formatedDate}`,
    } as Record<string, string>;
  };

  return (
    <div data-testid="anime-heatmap">
      <p className="text-lg font-bold mb-4">
        Watched {totalContributionCount} episodes in the last year
      </p>
      <CalendarHeatmap
        weekdayLabels={["", "M", "", "W", "", "F", ""]}
        showWeekdayLabels={true}
        showOutOfRangeDays={true}
        startDate={startDate}
        endDate={endDate}
        classForValue={(value) =>
          getClassForValue(value as unknown as HeatmapValue)
        }
        values={heatmapData}
        gutterSize={2}
        tooltipDataAttrs={(value) => getTooltipContent(value as HeatmapValue)}
      />
      <Tooltip id="heatmap-tooltip" />
    </div>
  );
}

export default AnimeHeatmap;
