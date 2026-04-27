export const requestCameraPermissionAndNavigate = async (navigate: (path: string) => void) => {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      
      // Stop the tracks immediately, we just needed the permission grant
      stream.getTracks().forEach(track => track.stop());
      
      // Navigate to the scanner page on success
      navigate('/scan-sms');
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Camera access is required. Please allow camera permissions in your browser/device settings.");
    }
  } else {
    // Fallback if mediaDevices is not available (e.g. non-HTTPS, or old browser)
    // We still navigate and let the CameraScanner handle its own error state
    navigate('/scan-sms');
  }
};
