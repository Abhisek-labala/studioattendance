/**
 * Studio GFX Geolocation & Reverse Geocoding Utility
 */

export interface ReverseGeocodeResult {
  fullAddress: string;
  shortAddress: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  const coordLabel = `${Math.abs(lat).toFixed(6)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(6)}° ${lng >= 0 ? 'E' : 'W'}`;

  // 0. If Google Maps API key is configured, use official Google Geocoding API
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (googleApiKey) {
    try {
      const gRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleApiKey}`
      );
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData.results && gData.results.length > 0) {
          const first = gData.results[0];
          return {
            fullAddress: first.formatted_address,
            shortAddress: first.formatted_address.split(',').slice(0, 3).join(','),
          };
        }
      }
    } catch {
      // fallback
    }
  }

  // 1. Try OpenStreetMap Nominatim with full address details
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'StudioGFXAttendanceApp/1.0 (contact@studiogfx.com)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const parts: string[] = [];

        // Specific street, building, or landmark
        const street = addr.building || addr.house_number || addr.road || addr.residential;
        if (street) parts.push(street);

        // Suburb / neighbourhood / village
        const locality = addr.suburb || addr.neighbourhood || addr.village;
        if (locality && !parts.includes(locality)) parts.push(locality);

        // Town / City / District
        const city = addr.city || addr.town || addr.municipality || addr.county || addr.district;
        if (city && !parts.includes(city)) parts.push(city);

        // State & Postcode
        const state = addr.state;
        const postcode = addr.postcode;
        if (state) {
          parts.push(postcode ? `${state} - ${postcode}` : state);
        } else if (postcode) {
          parts.push(postcode);
        }

        if (addr.country && !parts.includes(addr.country)) {
          parts.push(addr.country);
        }

        const fullAddress = parts.length > 0 ? parts.join(', ') : data.display_name;
        const shortAddress = [locality || street || city, city, state].filter(Boolean).join(', ') || fullAddress;

        return {
          shortAddress,
          fullAddress,
          city,
          state,
          country: addr.country,
          postcode,
        };
      }
    }
  } catch (err) {
    // fallback
  }

  // 2. Fallback: BigDataCloud Reverse Geocoding API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const parts: string[] = [];
      if (data.locality) parts.push(data.locality);
      if (data.city && !parts.includes(data.city)) parts.push(data.city);
      if (data.principalSubdivision && !parts.includes(data.principalSubdivision)) {
        parts.push(data.postcode ? `${data.principalSubdivision} - ${data.postcode}` : data.principalSubdivision);
      }
      if (data.countryName && !parts.includes(data.countryName)) parts.push(data.countryName);

      if (parts.length > 0) {
        const fullAddress = parts.join(', ');
        return {
          shortAddress: [data.locality || data.city, data.principalSubdivision].filter(Boolean).join(', '),
          fullAddress,
          city: data.city || data.locality,
          state: data.principalSubdivision,
          country: data.countryName,
          postcode: data.postcode,
        };
      }
    }
  } catch (err) {
    // fallback
  }

  return {
    shortAddress: coordLabel,
    fullAddress: `${coordLabel} (Exact GPS fix)`,
  };
}
