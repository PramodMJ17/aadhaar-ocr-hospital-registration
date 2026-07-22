export async function performAadhaarOCR(imageDataUrl) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ image: imageDataUrl })
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Sign-in session expired. Please log in again.');
      }
      throw new Error(`OCR Processing Failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in performAadhaarOCR:', error);
    throw error;
  }
}
