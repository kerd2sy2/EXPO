'use dom';
import React from 'react';

interface InAppVideoPlayerProps {
  url: string;
}

export default function InAppVideoPlayer({ url }: InAppVideoPlayerProps) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <video
        src={url}
        controls
        autoPlay
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}
