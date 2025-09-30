package video

import (
	"fmt"
	"image"
	"image/color"
	"math"
)

// Video processing filters and enhancements

// ColorProfile defines color enhancement settings
type ColorProfile struct {
	Contrast     float64 // -1.0 to 1.0
	Brightness   float64 // -1.0 to 1.0
	Saturation   float64 // 0.0 to 2.0
	Vibrance     float64 // 0.0 to 2.0
	Gamma        float64 // 0.1 to 3.0
	Highlights   float64 // -1.0 to 1.0
	Shadows      float64 // -1.0 to 1.0
	Temperature  float64 // -1.0 to 1.0 (blue to yellow)
	Tint         float64 // -1.0 to 1.0 (green to magenta)
}

// EnhancementOptions defines video enhancement settings
type EnhancementOptions struct {
	Enabled        bool
	ColorProfile   *ColorProfile
	UpscaleFactor  int      // 1, 2, 4
	Sharpen        float64  // 0.0 to 1.0
	NoiseReduction float64  // 0.0 to 1.0
	HDRSimulation  bool
	Profile        string   // "anime", "cinema", "gaming", "custom"
}

// Default profiles
var DefaultProfiles = map[string]*ColorProfile{
	"anime": {
		Contrast:    0.15,
		Brightness:  0.05,
		Saturation:  1.2,
		Vibrance:    1.3,
		Gamma:       1.1,
		Highlights:  0.1,
		Shadows:     0.2,
		Temperature: 0.0,
		Tint:        0.0,
	},
	"cinema": {
		Contrast:    0.2,
		Brightness:  0.0,
		Saturation:  1.1,
		Vibrance:    1.1,
		Gamma:       1.0,
		Highlights:  0.15,
		Shadows:     0.1,
		Temperature: 0.05,
		Tint:        -0.05,
	},
	"gaming": {
		Contrast:    0.25,
		Brightness:  0.1,
		Saturation:  1.3,
		Vibrance:    1.4,
		Gamma:       1.05,
		Highlights:  0.0,
		Shadows:     0.25,
		Temperature: 0.0,
		Tint:        0.0,
	},
	"vibrant": {
		Contrast:    0.3,
		Brightness:  0.15,
		Saturation:  1.5,
		Vibrance:    1.6,
		Gamma:       1.1,
		Highlights:  0.2,
		Shadows:     0.3,
		Temperature: 0.1,
		Tint:        0.05,
	},
}

// ApplyColorEnhancement applies color enhancements to an image
func ApplyColorEnhancement(img image.Image, profile *ColorProfile) image.Image {
	bounds := img.Bounds()
	enhanced := image.NewRGBA(bounds)
	
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			original := img.At(x, y)
			r, g, b, a := original.RGBA()
			
			// Convert to 0-1 range
			rf, gf, bf := float64(r)/65535.0, float64(g)/65535.0, float64(b)/65535.0
			
			// Apply gamma correction first
			if profile.Gamma != 1.0 {
				rf = math.Pow(rf, 1.0/profile.Gamma)
				gf = math.Pow(gf, 1.0/profile.Gamma)
				bf = math.Pow(bf, 1.0/profile.Gamma)
			}
			
			// Convert to HSL for better color manipulation
			h, s, l := rgbToHSL(rf, gf, bf)
			
			// Apply saturation and vibrance
			s = clamp(s*profile.Saturation, 0.0, 1.0)
			if profile.Vibrance > 1.0 {
				// Vibrance affects less saturated colors more
				vibranceFactor := profile.Vibrance * (1.0 - s) * 0.5
				s = clamp(s+vibranceFactor, 0.0, 1.0)
			}
			
			// Convert back to RGB
			rf, gf, bf = hslToRGB(h, s, l)
			
			// Apply brightness and contrast
			rf = clamp((rf-0.5)*(profile.Contrast+1.0)+0.5+profile.Brightness, 0.0, 1.0)
			gf = clamp((gf-0.5)*(profile.Contrast+1.0)+0.5+profile.Brightness, 0.0, 1.0)
			bf = clamp((bf-0.5)*(profile.Contrast+1.0)+0.5+profile.Brightness, 0.0, 1.0)
			
			// Apply highlight and shadow adjustments
			luminance := 0.299*rf + 0.587*gf + 0.114*bf
			if luminance > 0.5 {
				// Highlights
				highlightAdjust := profile.Highlights * (luminance - 0.5) * 2.0
				rf = clamp(rf+highlightAdjust, 0.0, 1.0)
				gf = clamp(gf+highlightAdjust, 0.0, 1.0)
				bf = clamp(bf+highlightAdjust, 0.0, 1.0)
			} else {
				// Shadows
				shadowAdjust := profile.Shadows * (0.5 - luminance) * 2.0
				rf = clamp(rf-shadowAdjust, 0.0, 1.0)
				gf = clamp(gf-shadowAdjust, 0.0, 1.0)
				bf = clamp(bf-shadowAdjust, 0.0, 1.0)
			}
			
			// Apply temperature and tint
			rf = clamp(rf+profile.Temperature*0.1, 0.0, 1.0)
			bf = clamp(bf-profile.Temperature*0.1, 0.0, 1.0)
			gf = clamp(gf+profile.Tint*0.1, 0.0, 1.0)
			rf = clamp(rf-profile.Tint*0.05, 0.0, 1.0)
			
			// Convert back to 16-bit
			enhancedR := uint16(clamp(rf*65535.0, 0, 65535))
			enhancedG := uint16(clamp(gf*65535.0, 0, 65535))
			enhancedB := uint16(clamp(bf*65535.0, 0, 65535))
			
			enhanced.Set(x, y, color.RGBA64{
				R: enhancedR,
				G: enhancedG,
				B: enhancedB,
				A: uint16(a),
			})
		}
	}
	
	return enhanced
}

// ApplySharpen applies sharpening filter to reduce blurriness
func ApplySharpen(img image.Image, amount float64) image.Image {
	if amount <= 0 {
		return img
	}
	
	bounds := img.Bounds()
	sharp := image.NewRGBA(bounds)
	
	// Simple sharpening kernel
	kernel := [9]float64{
		0, -amount, 0,
		-amount, 1 + 4*amount, -amount,
		0, -amount, 0,
	}
	
	for y := bounds.Min.Y + 1; y < bounds.Max.Y - 1; y++ {
		for x := bounds.Min.X + 1; x < bounds.Max.X - 1; x++ {
			var r, g, b float64
			
			// Apply convolution kernel
			for ky := -1; ky <= 1; ky++ {
				for kx := -1; kx <= 1; kx++ {
					cr, cg, cb, _ := img.At(x+kx, y+ky).RGBA()
					kernelIndex := (ky+1)*3 + (kx+1)
					r += float64(cr) * kernel[kernelIndex] / 65535.0
					g += float64(cg) * kernel[kernelIndex] / 65535.0
					b += float64(cb) * kernel[kernelIndex] / 65535.0
				}
			}
			
			_, _, _, a := img.At(x, y).RGBA()
			sharp.Set(x, y, color.RGBA64{
				R: uint16(clamp(r*65535.0, 0, 65535)),
				G: uint16(clamp(g*65535.0, 0, 65535)),
				B: uint16(clamp(b*65535.0, 0, 65535)),
				A: uint16(a),
			})
		}
	}
	
	return sharp
}

// ApplyHDRSimulation simulates HDR by expanding dynamic range
func ApplyHDRSimulation(img image.Image) image.Image {
	bounds := img.Bounds()
	hdr := image.NewRGBA(bounds)
	
	// Calculate image statistics
	var minL, maxL, avgL float64 = 1.0, 0.0, 0.0
	pixelCount := 0
	
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, _ := img.At(x, y).RGBA()
			luminance := 0.299*float64(r) + 0.587*float64(g) + 0.114*float64(b)
			l := luminance / 65535.0
			
			if l < minL {
				minL = l
			}
			if l > maxL {
				maxL = l
			}
			avgL += l
			pixelCount++
		}
	}
	avgL /= float64(pixelCount)
	
	// Apply HDR-like tonemapping
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, a := img.At(x, y).RGBA()
			rf, gf, bf := float64(r)/65535.0, float64(g)/65535.0, float64(b)/65535.0
			
			// Calculate luminance
			luminance := 0.299*rf + 0.587*gf + 0.114*bf
			
			// Apply contrast stretch
			if maxL > minL {
				stretchedL := (luminance - minL) / (maxL - minL)
				stretchedL = math.Pow(stretchedL, 0.8) // Gamma compression
				
				// Apply color preservation
				if luminance > 0 {
					factor := stretchedL / luminance
					rf = clamp(rf*factor, 0.0, 1.0)
					gf = clamp(gf*factor, 0.0, 1.0)
					bf = clamp(bf*factor, 0.0, 1.0)
				}
			}
			
			// Add subtle highlight glow
			if luminance > avgL * 1.2 {
				glow := (luminance - avgL*1.2) / (1.0 - avgL*1.2)
				rf = clamp(rf + glow*0.1, 0.0, 1.0)
				gf = clamp(gf + glow*0.1, 0.0, 1.0)
				bf = clamp(bf + glow*0.1, 0.0, 1.0)
			}
			
			hdr.Set(x, y, color.RGBA64{
				R: uint16(clamp(rf*65535.0, 0, 65535)),
				G: uint16(clamp(gf*65535.0, 0, 65535)),
				B: uint16(clamp(bf*65535.0, 0, 65535)),
				A: uint16(a),
			})
		}
	}
	
	return hdr
}

// GetEnhancementProfile returns a color profile by name
func GetEnhancementProfile(profileName string) *ColorProfile {
	if profile, exists := DefaultProfiles[profileName]; exists {
		return profile
	}
	return DefaultProfiles["anime"] // Default fallback
}

// GetEnhancementOptionsFromQuery parses enhancement options from URL query parameters
func GetEnhancementOptionsFromQuery(queryParams map[string][]string) *EnhancementOptions {
	options := &EnhancementOptions{
		Enabled:       false,
		ColorProfile:  &ColorProfile{},
		UpscaleFactor: 1,
		Sharpen:       0.0,
		NoiseReduction: 0.0,
		HDRSimulation: false,
	}
	
	if enhance := queryParams["enhance"]; len(enhance) > 0 && enhance[0] == "true" {
		options.Enabled = true
		
		if profile := queryParams["profile"]; len(profile) > 0 {
			options.Profile = profile[0]
			options.ColorProfile = GetEnhancementProfile(profile[0])
		}
		
		if upscale := queryParams["upscale"]; len(upscale) > 0 {
			switch upscale[0] {
			case "2x":
				options.UpscaleFactor = 2
			case "4x":
				options.UpscaleFactor = 4
			}
		}
		
		if sharpen := queryParams["sharpen"]; len(sharpen) > 0 {
			fmt.Sscanf(sharpen[0], "%f", &options.Sharpen)
		}
		
		if hdr := queryParams["hdr"]; len(hdr) > 0 && hdr[0] == "true" {
			options.HDRSimulation = true
		}
	}
	
	return options
}

// Helper functions
func clamp(value float64, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func rgbToHSL(r, g, b float64) (h, s, l float64) {
	max := math.Max(r, math.Max(g, b))
	min := math.Min(r, math.Min(g, b))
	l = (max + min) / 2
	
	if max == min {
		h, s = 0, 0
		return
	}
	
	d := max - min
	s = 0.0
	if l > 0.5 {
		s = d / (2 - max - min)
	} else {
		s = d / (max + min)
	}
	
	switch max {
	case r:
		h = (g - b) / d
		if g < b {
			h += 6
		}
	case g:
		h = (b-r)/d + 2
	case b:
		h = (r-g)/d + 4
	}
	h /= 6
	
	return h, s, l
}

func hslToRGB(h, s, l float64) (r, g, b float64) {
	if s == 0 {
		r, g, b = l, l, l
		return
	}
	
	var v1, v2 float64
	if l < 0.5 {
		v2 = l * (1 + s)
	} else {
		v2 = (l + s) - (s * l)
	}
	
	v1 = 2*l - v2
	
	r = hueToRGB(v1, v2, h+(1.0/3.0))
	g = hueToRGB(v1, v2, h)
	b = hueToRGB(v1, v2, h-(1.0/3.0))
	
	return r, g, b
}

func hueToRGB(v1, v2, h float64) float64 {
	if h < 0 {
		h += 1
	}
	if h > 1 {
		h -= 1
	}
	
	switch {
	case 6*h < 1:
		return v1 + (v2-v1)*6*h
	case 2*h < 1:
		return v2
	case 3*h < 1:
		return v1 + (v2-v1)*((2.0/3.0)-h)*6
	}
	return v1
}

func clampInt(value int, min, max int) int {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}