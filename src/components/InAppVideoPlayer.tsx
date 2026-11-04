'use dom';
import React, { useRef, useState, useEffect } from 'react';

interface InAppVideoPlayerProps {
  url: string;
}

export default function InAppVideoPlayer({ url }: InAppVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setCurrentTime(0);
    setIsPlaying(false);
  }, [url]);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setHasError(true));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    triggerControlsVisibility();
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      setIsLoading(false);
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Auto-play was prevented by mobile browser policy; user can tap
          setIsPlaying(false);
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    } else if ((videoRef.current as any).webkitEnterFullscreen) {
      (videoRef.current as any).webkitEnterFullscreen();
    }
  };

  const triggerControlsVisibility = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3500);
  };

  const formatSec = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      onClick={triggerControlsVisibility}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, Roboto, sans-serif',
        userSelect: 'none',
      }}
    >
      <video
        ref={videoRef}
        src={url}
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsPlaying(true);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setShowControls(true);
        }}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />

      {/* Buffering Spinner */}
      {isLoading && !hasError && (
        <div
          style={{
            position: 'absolute',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            border: '4px solid rgba(255, 255, 255, 0.2)',
            borderTopColor: '#f59e0b',
            animation: 'spin 0.8s linear infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Error Fallback */}
      {hasError && (
        <div
          style={{
            position: 'absolute',
            padding: '24px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderRadius: '16px',
            border: '1px solid #ef4444',
            textAlign: 'center',
            color: '#ffffff',
            maxWidth: '320px',
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
          <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
            تعذر تشغيل الفيديو داخل المشغل
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
            قد يتطلب الفيديو صيغة متوافقة أو اتصالاً أسرع.
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              backgroundColor: '#f59e0b',
              color: '#000000',
              fontWeight: 800,
              fontSize: '13px',
              padding: '10px 18px',
              borderRadius: '10px',
              textDecoration: 'none',
            }}
          >
            فتح الرابط المباشر للمشاهدة
          </a>
        </div>
      )}

      {/* Big Center Play/Pause Button Overlay */}
      {showControls && !isLoading && !hasError && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            handlePlayPause();
          }}
          style={{
            position: 'absolute',
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            border: '2px solid rgba(245, 158, 11, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            transition: 'transform 0.15s ease',
            zIndex: 5,
          }}
        >
          {isPlaying ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ width: '6px', height: '24px', backgroundColor: '#ffffff', borderRadius: '2px' }} />
              <div style={{ width: '6px', height: '24px', backgroundColor: '#ffffff', borderRadius: '2px' }} />
            </div>
          ) : (
            <div
              style={{
                width: '0',
                height: '0',
                borderTop: '12px solid transparent',
                borderBottom: '12px solid transparent',
                borderLeft: '20px solid #f59e0b',
                marginLeft: '4px',
              }}
            />
          )}
        </div>
      )}

      {/* Modern Bottom Controls Bar */}
      {showControls && !hasError && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px 16px 20px 16px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 6,
          }}
        >
          {/* Progress Scrubber */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            style={{
              width: '100%',
              accentColor: '#f59e0b',
              cursor: 'pointer',
              height: '4px',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handlePlayPause}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                {formatSec(currentTime)} / {formatSec(duration)}
              </span>
            </div>

            <button
              onClick={handleFullscreen}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '8px',
              }}
            >
              ⛶ ملء الشاشة
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input[type=range] {
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 2px;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #f59e0b;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(245, 158, 11, 0.8);
        }
      `}</style>
    </div>
  );
}
