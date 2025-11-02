/**
 * Optimized Image Component
 * 优化的图片组件
 * 
 * ⚡ Performance: Lazy loading + CDN optimization + responsive images
 * 性能优化：懒加载 + CDN优化 + 响应式图片
 */

import React from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  quality?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  effect?: 'blur' | 'opacity' | 'black-and-white';
}

/**
 * Optimized Image with Cloudinary transformations
 * 使用 Cloudinary 转换的优化图片
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  quality = 80,
  fit = 'cover',
  placeholder,
  className = '',
  style = {},
  onClick,
  effect = 'blur',
}) => {
  // Generate optimized image URL
  const getOptimizedUrl = (originalUrl: string): string => {
    // Check if it's a Cloudinary URL
    if (originalUrl.includes('cloudinary.com')) {
      const params = [];
      
      // Add width parameter
      if (width) {
        params.push(`w_${typeof width === 'number' ? width : parseInt(width as string)}`);
      }
      
      // Add height parameter
      if (height) {
        params.push(`h_${typeof height === 'number' ? height : parseInt(height as string)}`);
      }
      
      // Add quality parameter
      params.push(`q_${quality}`);
      
      // Add fit parameter
      params.push(`c_${fit}`);
      
      // Add format auto (serve WebP when supported)
      params.push('f_auto');
      
      // Add DPR auto (serve 2x on retina displays)
      params.push('dpr_auto');
      
      // Insert parameters into Cloudinary URL
      const transformations = params.join(',');
      return originalUrl.replace('/upload/', `/upload/${transformations}/`);
    }
    
    // For non-Cloudinary URLs, return as-is
    return originalUrl;
  };

  const optimizedSrc = getOptimizedUrl(src);
  const placeholderSrc = placeholder || getOptimizedUrl(src).replace(/q_\d+/, 'q_10').replace(/w_\d+/, 'w_50');

  return (
    <LazyLoadImage
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      placeholderSrc={placeholderSrc}
      effect={effect}
      className={className}
      style={style}
      onClick={onClick}
    />
  );
};

/**
 * Optimized Avatar with Cloudinary
 * 优化的头像组件
 */
interface OptimizedAvatarProps {
  src?: string;
  size?: number;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
}

export const OptimizedAvatar: React.FC<OptimizedAvatarProps> = ({
  src,
  size = 40,
  alt = 'Avatar',
  className = '',
  style = {},
  fallback,
}) => {
  if (!src) {
    return <div className={`optimized-avatar-fallback ${className}`} style={{ width: size, height: size, ...style }}>{fallback}</div>;
  }

  const getAvatarUrl = (url: string): string => {
    if (url.includes('cloudinary.com')) {
      return url.replace(
        '/upload/',
        `/upload/w_${size * 2},h_${size * 2},c_fill,g_face,q_auto,f_auto,dpr_auto/`
      );
    }
    return url;
  };

  return (
    <LazyLoadImage
      src={getAvatarUrl(src)}
      alt={alt}
      width={size}
      height={size}
      effect="opacity"
      className={`optimized-avatar ${className}`}
      style={{
        borderRadius: '50%',
        objectFit: 'cover',
        ...style,
      }}
    />
  );
};

/**
 * Optimized Event Card Image
 * 优化的活动卡片图片
 */
interface OptimizedEventImageProps {
  src: string;
  alt: string;
  aspectRatio?: number; // e.g., 16/9, 4/3, 1/1
  className?: string;
  style?: React.CSSProperties;
}

export const OptimizedEventImage: React.FC<OptimizedEventImageProps> = ({
  src,
  alt,
  aspectRatio = 16 / 9,
  className = '',
  style = {},
}) => {
  const width = 400;
  const height = Math.round(width / aspectRatio);

  const getEventImageUrl = (url: string): string => {
    if (url.includes('cloudinary.com')) {
      return url.replace(
        '/upload/',
        `/upload/w_${width},h_${height},c_fill,g_auto,q_80,f_auto,dpr_auto/`
      );
    }
    return url;
  };

  return (
    <div 
      className={`optimized-event-image-container ${className}`}
      style={{ 
        position: 'relative',
        width: '100%',
        paddingTop: `${(1 / aspectRatio) * 100}%`,
        overflow: 'hidden',
        ...style,
      }}
    >
      <LazyLoadImage
        src={getEventImageUrl(src)}
        alt={alt}
        effect="blur"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </div>
  );
};

/**
 * Responsive Image with srcset
 * 响应式图片（带srcset）
 */
interface ResponsiveImageProps {
  src: string;
  alt: string;
  sizes?: string; // e.g., "(max-width: 600px) 100vw, 50vw"
  widths?: number[]; // e.g., [320, 640, 960, 1280]
  className?: string;
  style?: React.CSSProperties;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  sizes = '100vw',
  widths = [320, 640, 960, 1280],
  className = '',
  style = {},
}) => {
  const getSrcSet = (url: string): string => {
    if (!url.includes('cloudinary.com')) {
      return '';
    }

    return widths
      .map(w => {
        const optimizedUrl = url.replace(
          '/upload/',
          `/upload/w_${w},q_auto,f_auto/`
        );
        return `${optimizedUrl} ${w}w`;
      })
      .join(', ');
  };

  const srcSet = getSrcSet(src);
  const defaultSrc = src.includes('cloudinary.com')
    ? src.replace('/upload/', '/upload/w_960,q_auto,f_auto/')
    : src;

  return (
    <LazyLoadImage
      src={defaultSrc}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      effect="blur"
      className={className}
      style={style}
    />
  );
};

export default OptimizedImage;

