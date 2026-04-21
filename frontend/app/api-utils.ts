
export const getApiUrl = (path: string) => {
  const baseUrl = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:5000`)
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
  
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};
