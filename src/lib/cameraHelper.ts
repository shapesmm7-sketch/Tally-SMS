export const requestCameraPermissionAndNavigate = async (navigate: (path: string) => void) => {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      
      // Stop the tracks immediately, we just needed the permission grant
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error("Camera access error:", err);
      // Don't alert here. We navigate to the scanner page anyway, 
      // where react-webcam's onUserMediaError will handle the denied state 
      // and show a nice localized UI.
    }
  }
  
  // Navigate to the scanner page on success or failure (to show the error UI)
  navigate('/scan-sms');
};
