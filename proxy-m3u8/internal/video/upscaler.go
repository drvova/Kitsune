package video

import (
	"image"
	"image/color"
	"math"
)

// Upscaler implements various upscaling algorithms
type Upscaler struct {
	method string
}

// NewUpscaler creates a new upscaler with the specified method
func NewUpscaler(method string) *Upscaler {
	return &Upscaler{method: method}
}

// Upscale scales up an image by the specified factor
func (u *Upscaler) Upscale(img image.Image, factor int) image.Image {
	if factor <= 1 {
		return img
	}
	
	switch u.method {
	case "nearest":
		return u.nearestNeighborUpscale(img, factor)
	case "bilinear":
		return u.bilinearUpscale(img, factor)
	case "bicubic":
		return u.bicubicUpscale(img, factor)
	case "lanczos":
		return u.lanczosUpscale(img, factor)
	default:
		return u.bilinearUpscale(img, factor) // Default to bilinear
	}
}

// nearestNeighborUpscale implements simple nearest neighbor scaling
func (u *Upscaler) nearestNeighborUpscale(img image.Image, factor int) image.Image {
	originalBounds := img.Bounds()
	newWidth := originalBounds.Dx() * factor
	newHeight := originalBounds.Dy() * factor
	
	upscaled := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))
	
	for y := 0; y < newHeight; y++ {
		for x := 0; x < newWidth; x++ {
			srcX := x / factor
			srcY := y / factor
			pixel := img.At(originalBounds.Min.X+srcX, originalBounds.Min.Y+srcY)
			upscaled.Set(x, y, pixel)
		}
	}
	
	return upscaled
}

// bilinearUpscale implements bilinear interpolation scaling
func (u *Upscaler) bilinearUpscale(img image.Image, factor int) image.Image {
	originalBounds := img.Bounds()
	newWidth := originalBounds.Dx() * factor
	newHeight := originalBounds.Dy() * factor
	
	upscaled := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))
	
	for y := 0; y < newHeight; y++ {
		for x := 0; x < newWidth; x++ {
			srcX := float64(x) / float64(factor)
			srcY := float64(y) / float64(factor)
			
			x1 := int(math.Floor(srcX))
			y1 := int(math.Floor(srcY))
			x2 := int(math.Ceil(srcX))
			y2 := int(math.Ceil(srcY))
			
			// Clamp to image bounds
			x1 = clampInt(x1, originalBounds.Min.X, originalBounds.Max.X-1)
			x2 = clampInt(x2, originalBounds.Min.X, originalBounds.Max.X-1)
			y1 = clampInt(y1, originalBounds.Min.Y, originalBounds.Max.Y-1)
			y2 = clampInt(y2, originalBounds.Min.Y, originalBounds.Max.Y-1)
			
			// Get surrounding pixels
			p11 := img.At(x1, y1)
			p12 := img.At(x1, y2)
			p21 := img.At(x2, y1)
			p22 := img.At(x2, y2)
			
			r11, g11, b11, a11 := p11.RGBA()
			r12, g12, b12, a12 := p12.RGBA()
			r21, g21, b21, a21 := p21.RGBA()
			r22, g22, b22, a22 := p22.RGBA()
			
			// Calculate interpolation weights
			wx := srcX - float64(x1)
			wy := srcY - float64(y1)
			
			// Bilinear interpolation
			r := float64(r11)*(1-wx)*(1-wy) + float64(r21)*wx*(1-wy) + 
				 float64(r12)*(1-wx)*wy + float64(r22)*wx*wy
			g := float64(g11)*(1-wx)*(1-wy) + float64(g21)*wx*(1-wy) + 
				 float64(g12)*(1-wx)*wy + float64(g22)*wx*wy
			b := float64(b11)*(1-wx)*(1-wy) + float64(b21)*wx*(1-wy) + 
				 float64(b12)*(1-wx)*wy + float64(b22)*wx*wy
			a := float64(a11)*(1-wx)*(1-wy) + float64(a21)*wx*(1-wy) + 
				 float64(a12)*(1-wx)*wy + float64(a22)*wx*wy
			
			upscaled.Set(x, y, color.RGBA64{
				R: uint16(clamp(r, 0, 65535)),
				G: uint16(clamp(g, 0, 65535)),
				B: uint16(clamp(b, 0, 65535)),
				A: uint16(clamp(a, 0, 65535)),
			})
		}
	}
	
	return upscaled
}

// bicubicUpscale implements bicubic interpolation scaling
func (u *Upscaler) bicubicUpscale(img image.Image, factor int) image.Image {
	originalBounds := img.Bounds()
	newWidth := originalBounds.Dx() * factor
	newHeight := originalBounds.Dy() * factor
	
	upscaled := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))
	
	for y := 0; y < newHeight; y++ {
		for x := 0; x < newWidth; x++ {
			srcX := float64(x) / float64(factor)
			srcY := float64(y) / float64(factor)
			
			x0 := int(math.Floor(srcX)) - 1
			y0 := int(math.Floor(srcY)) - 1
			
			// Get 4x4 grid of pixels for bicubic interpolation
			var pixels [4][4]color.RGBA64
			for dy := 0; dy < 4; dy++ {
				for dx := 0; dx < 4; dx++ {
					sx := clampInt(x0+dx, originalBounds.Min.X, originalBounds.Max.X-1)
					sy := clampInt(y0+dy, originalBounds.Min.Y, originalBounds.Max.Y-1)
					r, g, b, a := img.At(sx, sy).RGBA()
					pixels[dy][dx] = color.RGBA64{
						R: uint16(r),
						G: uint16(g),
						B: uint16(b),
						A: uint16(a),
					}
				}
			}
			
			dx := srcX - float64(x0+1)
			dy := srcY - float64(y0+1)
			
			r := u.bicubicInterpolate(pixels, dx, dy, func(c color.RGBA64) float64 { return float64(c.R) })
			g := u.bicubicInterpolate(pixels, dx, dy, func(c color.RGBA64) float64 { return float64(c.G) })
			b := u.bicubicInterpolate(pixels, dx, dy, func(c color.RGBA64) float64 { return float64(c.B) })
			a := u.bicubicInterpolate(pixels, dx, dy, func(c color.RGBA64) float64 { return float64(c.A) })
			
			upscaled.Set(x, y, color.RGBA64{
				R: uint16(clamp(r, 0, 65535)),
				G: uint16(clamp(g, 0, 65535)),
				B: uint16(clamp(b, 0, 65535)),
				A: uint16(clamp(a, 0, 65535)),
			})
		}
	}
	
	return upscaled
}

// lanczosUpscale implements Lanczos resampling
func (u *Upscaler) lanczosUpscale(img image.Image, factor int) image.Image {
	// Simplified Lanczos implementation
	// For production use, consider using a library like github.com/disintegration/imaging
	return u.bicubicUpscale(img, factor) // Fallback to bicubic for now
}

// bicubicInterpolate performs bicubic interpolation on a 4x4 grid
func (u *Upscaler) bicubicInterpolate(pixels [4][4]color.RGBA64, dx, dy float64, colorFunc func(color.RGBA64) float64) float64 {
	// Cubic interpolation function
	cubic := func(t float64) float64 {
		t = math.Abs(t)
		if t <= 1 {
			return 1 - 2*t*t + t*t*t
		} else if t <= 2 {
			return 4 - 8*t + 5*t*t - t*t*t
		}
		return 0
	}
	
	var result float64
	for dyi := 0; dyi < 4; dyi++ {
		var rowResult float64
		for dxi := 0; dxi < 4; dxi++ {
			weight := cubic(float64(dxi)-1-dx) * cubic(float64(dyi)-1-dy)
			rowResult += weight * colorFunc(pixels[dyi][dxi])
		}
		result += rowResult
	}
	
	return result
}

// SuperResolutionUpscale implements AI-style upscaling with edge enhancement
func (u *Upscaler) SuperResolutionUpscale(img image.Image, factor int) image.Image {
	// This is a simplified "AI-style" upscaler
	// For true AI upscaling, you'd integrate with TensorFlow Lite or ONNX Runtime
	
	// First upscale using bicubic
	upscaled := u.bicubicUpscale(img, factor)
	
	// Apply edge enhancement
	return u.enhanceEdges(upscaled)
}

// enhanceEdges applies edge enhancement to make upscaled image appear sharper
func (u *Upscaler) enhanceEdges(img image.Image) image.Image {
	bounds := img.Bounds()
	enhanced := image.NewRGBA(bounds)
	
	// Simple edge detection and enhancement
	for y := 1; y < bounds.Max.Y-1; y++ {
		for x := 1; x < bounds.Max.X-1; x++ {
			// Get pixel and neighbors
			center := img.At(x, y)
			left := img.At(x-1, y)
			right := img.At(x+1, y)
			top := img.At(x, y-1)
			bottom := img.At(x, y+1)
			
			cr, cg, cb, ca := center.RGBA()
			lr, lg, lb, _ := left.RGBA()
			rr, rg, rb, _ := right.RGBA()
			tr, tg, tb, _ := top.RGBA()
			br, bg, bb, _ := bottom.RGBA()
			
			// Calculate edge strength
			edgeR := math.Abs(float64(lr-rr) + float64(tr-br))
			edgeG := math.Abs(float64(lg-rg) + float64(tg-bg))
			edgeB := math.Abs(float64(lb-rb) + float64(tb-bb))
			
			edgeStrength := (edgeR + edgeG + edgeB) / (3.0 * 65535.0)
			
			// Enhance edges
			if edgeStrength > 0.1 {
				factor := 1.0 + edgeStrength*0.5
				enhanced.Set(x, y, color.RGBA64{
					R: uint16(clamp(float64(cr)*factor, 0, 65535)),
					G: uint16(clamp(float64(cg)*factor, 0, 65535)),
					B: uint16(clamp(float64(cb)*factor, 0, 65535)),
					A: uint16(ca),
				})
			} else {
				enhanced.Set(x, y, center)
			}
		}
	}
	
	return enhanced
}