import { useEffect, useRef } from "react";

const SUPPORTS_MEDIA_DEVICES = "mediaDevices" in navigator;

function App() {
  const ref = useRef<HTMLAudioElement | null>(null);

  const trackRef = useRef<MediaStreamTrack>(null);

  useEffect(() => {
    if (SUPPORTS_MEDIA_DEVICES) {
      //Get the environment camera (usually the second one)
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const cameras = devices.filter(
          (device) => device.kind === "videoinput"
        );

        if (cameras.length === 0) {
          throw "No camera found on this device.";
        }
        const camera = cameras[cameras.length - 1];

        // Create stream and get video track
        navigator.mediaDevices
          .getUserMedia({
            video: {
              deviceId: camera.deviceId,
              facingMode: "environment",
              height: { ideal: 1080 },
              width: { ideal: 1920 },
            },
          })
          .then((stream) => {
            const track = stream.getVideoTracks()[0];

            //Create image capture object and get camera capabilities
            const imageCapture = new ImageCapture(track);
            imageCapture.getPhotoCapabilities().then(() => {
              //let there be light!
              trackRef.current = track;
            });
          });
      });
    }
  }, []);

  const onTase = async () => {
    if (ref.current && trackRef.current) {
      trackRef.current.applyConstraints({
        advanced: [{ torch: true }],
      });
      await ref.current.play();

      ref.current.onpause = () => {
        if (trackRef.current) {
          trackRef.current.applyConstraints({
            advanced: [{ torch: false }],
          });
        }
      };
    }
  };

  return (
    <>
      <audio ref={ref} src="/tase.mp3" />

      <button onClick={onTase}>Tase</button>
    </>
  );
}

export default App;
