import { useCallback, useEffect, useRef, useState } from "react";

const SUPPORTS_MEDIA_DEVICES = "mediaDevices" in navigator;

function App() {
  // Define typed refs
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null
  );
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const mediaStreamTrackRef = useRef<MediaStreamTrack | null>(null);

  const holdTimer = useRef<number | null>(null);

  // Function to update background with frequency-based flashing
  const flashBackground = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    if (!mediaStreamTrackRef.current) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Calculate average frequency intensity for flash effect
    const average =
      dataArray.reduce((sum: number, value: number) => sum + value, 0) /
      bufferLength;
    const intensity = Math.min(average * 2, 255); // Scale and cap at 255

    // Create a taser-like flashing effect (blue-white pulses)
    const flashColor =
      intensity > 100
        ? `rgb(${intensity}, ${intensity}, 255)`
        : `rgb(0, 0, ${intensity})`;
    document.body.style.backgroundColor = flashColor;
    mediaStreamTrackRef.current.applyConstraints({
      advanced: [{ torch: true }],
    });

    // Reset to a dark base color briefly for contrast (taser flicker)
    setTimeout(() => {
      document.body.style.backgroundColor = "#1a1a1a"; // Dark gray base

      mediaStreamTrackRef.current?.applyConstraints({
        advanced: [{ torch: false }],
      });
    }, 50); // Short delay for flicker effect

    // Keep the animation running
    animationFrameRef.current = requestAnimationFrame(flashBackground);
  }, []);

  useEffect(() => {
    if (!audioElement) return;

    // Initialize AudioContext and nodes
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const audioContext = audioContextRef.current;

    if (!mediaSourceRef.current) {
      try {
        mediaSourceRef.current =
          audioContext.createMediaElementSource(audioElement);
        analyserRef.current = audioContext.createAnalyser();
        analyserRef.current.fftSize = 512; // Smaller FFT size for faster response

        // Connect nodes: source -> analyser -> destination
        mediaSourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContext.destination);
      } catch (error) {
        console.error("Error creating media source or analyser:", error);
      }
    }

    // Start flashing when audio plays
    const handlePlay = () => {
      if (audioContext.state === "suspended") {
        audioContext.resume(); // Resume context on user interaction
      }
      if (!animationFrameRef.current) {
        flashBackground();
      }
    };

    // Stop flashing when audio ends
    const handleEnd = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      document.body.style.backgroundColor = "#1a1a1a"; // Reset to base color

      audioElement?.pause();
    };

    audioElement.addEventListener("play", handlePlay);
    audioElement.addEventListener("pause", handleEnd);

    // Cleanup on unmount
    return () => {
      audioElement.removeEventListener("play", handlePlay);
      audioElement.removeEventListener("pause", handleEnd);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaSourceRef.current) {
        mediaSourceRef.current.disconnect();
        mediaSourceRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      document.body.style.backgroundColor = ""; // Reset to default
    };
  }, [audioElement, flashBackground]);

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
              mediaStreamTrackRef.current = track;
            });
          });
      });
    }
  }, []);

  const onMouseDown = () => {
    holdTimer.current = setTimeout(async () => {
      if (audioElement) {
        await audioElement.play();
        audioElement.loop = true;
      }
    }, 100);
  };

  const onMouseUp = async () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
    }

    if (audioElement) {
      audioElement.pause();
      audioElement.loop = false;
    }
  };

  return (
    <>
      <audio ref={setAudioElement} src="/tase.mp3" />

      <div
        className="trigger"
        onPointerUp={onMouseUp}
        onPointerDown={onMouseDown}
      />
    </>
  );
}

export default App;
