# Video Enhancement Features

This document describes the video enhancement capabilities available in the M3U8 proxy server.

## Overview

The proxy server can enhance video quality through real-time processing including color enhancement, upscaling, and HDR simulation.

## Features

### 🎨 Color Enhancement

**Available Profiles:**
- **anime**: Optimized for anime content with vibrant colors
- **cinema**: Movie theater color calibration
- **gaming**: Enhanced contrast and saturation for gaming
- **vibrant**: Maximum color pop and vibrancy

**Color Adjustments:**
- Contrast: -1.0 to 1.0
- Brightness: -1.0 to 1.0  
- Saturation: 0.0 to 2.0
- Vibrance: 0.0 to 2.0
- Gamma: 0.1 to 3.0
- Highlights/Shadows: -1.0 to 1.0
- Temperature/Tint: Color balance adjustments

### 🔍 Quality Upscaling

**Scaling Methods:**
- **nearest**: Fast but pixelated
- **bilinear**: Good balance of speed and quality
- **bicubic**: High quality interpolation
- **lanczos**: Best quality, slower

**Scaling Factors:**
- 2x upscale (1080p → 4K)
- 4x upscale (720p → 4K)

### ✨ Special Effects

**HDR Simulation:**
- Dynamic range expansion
- Highlight glow effects
- Improved contrast
- Shadow detail enhancement

**Sharpening:**
- Edge enhancement
- Detail preservation
- Adjustable intensity (0.0 to 1.0)

## Usage

### Basic Enhancement

```bash
# Enable anime color profile
curl "http://localhost:8080/m3u8-proxy?url=VIDEO_URL&enhance=true&profile=anime"

# Enable 2x upscaling
curl "http://localhost:8080/m3u8-proxy?url=VIDEO_URL&enhance=true&upscale=2x"

# Enable HDR simulation
curl "http://localhost:8080/m3u8-proxy?url=VIDEO_URL&enhance=true&hdr=true"

# Apply sharpening
curl "http://localhost:8080/m3u8-proxy?url=VIDEO_URL&enhance=true&sharpen=0.5"

# Combine multiple enhancements
curl "http://localhost:8080/m3u8-proxy?url=VIDEO_URL&enhance=true&profile=cinema&upscale=2x&sharpen=0.3&hdr=true"
```

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `enhance` | boolean | Enable video enhancement | `enhance=true` |
| `profile` | string | Color profile name | `profile=anime` |
| `upscale` | string | Upscaling factor | `upscale=2x` |
| `sharpen` | float | Sharpening intensity | `sharpen=0.5` |
| `hdr` | boolean | Enable HDR simulation | `hdr=true` |

## Color Profiles

### Anime Profile
- **Contrast**: +15%
- **Saturation**: +20%
- **Vibrance**: +30%
- **Gamma**: 1.1
- Perfect for animated content

### Cinema Profile
- **Contrast**: +20%
- **Saturation**: +10%
- **Temperature**: Warm tone
- **Highlights**: +15%
- Movie theater experience

### Gaming Profile
- **Contrast**: +25%
- **Saturation**: +30%
- **Brightness**: +10%
- **Shadows**: +25%
- Enhanced gaming visuals

### Vibrant Profile
- **Contrast**: +30%
- **Saturation**: +50%
- **Vibrance**: +60%
- Maximum color impact

## Implementation Notes

### Current Limitations
- Video processing is currently simulated (logs enhancements only)
- Full implementation requires FFmpeg integration for TS segment processing
- Real-time processing depends on CPU/GPU capabilities

### Performance Considerations
- Higher upscaling factors increase processing time
- Complex color profiles require more computation
- HDR simulation adds significant processing overhead
- Sharpening can amplify compression artifacts

### Response Headers
Enhanced videos include additional headers:
- `X-Enhanced: upscaled` - Video was upscaled
- `X-Enhanced: hdr` - HDR simulation was applied

## Future Enhancements

### Planned Features
- **AI-powered upscaling** using neural networks
- **Real-time denoising** for compressed content
- **Adaptive brightness** based on content
- **Color space conversion** (SDR to HDR)
- **Motion interpolation** for smoother playback

### Integration Options
- **FFmpeg integration** for professional video processing
- **GPU acceleration** using CUDA/Vulkan
- **Machine learning** models for super-resolution
- **WebAssembly** for client-side processing

## Examples

### Enhance Anime Content
```bash
curl "http://localhost:8080/m3u8-proxy?url=ANIME_STREAM.m3u8&enhance=true&profile=anime&upscale=2x"
```

### Cinema Quality Enhancement
```bash
curl "http://localhost:8080/m3u8-proxy?url=MOVIE_STREAM.m3u8&enhance=true&profile=cinema&hdr=true&sharpen=0.2"
```

### Gaming Content
```bash
curl "http://localhost:8080/m3u8-proxy?url=GAME_STREAM.m3u8&enhance=true&profile=gaming&upscale=2x&sharpen=0.4"
```

### Maximum Quality
```bash
curl "http://localhost:8080/m3u8-proxy?url=VIDEO_STREAM.m3u8&enhance=true&profile=vibrant&upscale=4x&sharpen=0.6&hdr=true"
```

## Troubleshooting

### Common Issues

1. **No Enhancement Applied**
   - Verify `enhance=true` parameter is included
   - Check if content type is supported (.ts files only)

2. **High Latency**
   - Reduce upscaling factor (use 2x instead of 4x)
   - Lower sharpening intensity
   - Disable HDR simulation

3. **Artifacts or Noise**
   - Reduce sharpening amount
   - Try different color profile
   - Disable aggressive enhancements

### Performance Tuning

For optimal performance:
- Use `bilinear` upscaling for balance
- Keep sharpening below 0.5
- Use `anime` profile for general content
- Avoid 4x upscaling on low-power systems