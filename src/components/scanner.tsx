import { useEffect, useRef } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';

export const Scanner = ({ onScan }: { onScan: (data: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const codeReader = new BrowserQRCodeReader();
    let active = true;

    const startScan = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await codeReader.decodeFromVideoDevice(
            undefined, 
            videoRef.current,
            (result, err) => {
              if (result && active) onScan(result.getText());
              if (err) console.debug('Scanning error:', err);
            }
          );
        }
      } catch (error) {
        console.error('Camera initialization failed:', error);
      }
    };

    startScan();
    return () => {
      active = false;
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="relative w-full aspect-video">
      <video 
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover rounded-lg"
      />
    </div>
  );
};