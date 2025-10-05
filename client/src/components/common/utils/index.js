/**
 * Generates an avatar image with initials
 * @param {string} initials - Initials to display on the avatar
 * @param {number} [size=100] - Image size in pixels (square)
 * @param {string} [bgColor='#4a4a4a'] - Background color of the avatar
 * @param {string} [textColor='#ffffff'] - Text color (initials)
 * @returns {string} - Generated PNG image data URL
 */
export function generateAvatarImage(initials, size = 100, bgColor = '#4a4a4a', textColor = '#ffffff') {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = textColor;
  ctx.font = `${size * 0.5}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, size / 2, size / 2);
  return canvas.toDataURL('image/png');
}

/**
 * Checks if a value is an empty string or contains only spaces
 * @param {any} value - Value to test
 * @returns {boolean} true if empty or spaces only, false otherwise
 */
export function isEmptyString(value) {
  return String(value || '').trim().length === 0;
}

/**
 * Converts a date to "YYYY-MM-DD" string according to local time
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date (YYYY-MM-DD)
 * @throws {Error} If parameter is not a valid Date object
 */
export function toLocalISODate(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    throw new Error('Invalid parameter: provide a valid Date object');
  }
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset)
    .toISOString()
    .split('T')[0];
}

/**
 * Converts a date to "YYYY-MM-DD HH:mm:ss" string according to local time
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date (YYYY-MM-DD HH:mm:ss)
 * @throws {Error} If parameter is not a valid Date object
 */
export function toLocalISODateTime(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    throw new Error('Invalid parameter: provide a valid Date object');
  }
  const tzOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - tzOffset);
  const [yyyy, mm, dd] = localDate.toISOString().split('T')[0].split('-');
  const [hh, min, ss] = localDate
    .toISOString()
    .split('T')[1]
    .split('.')[0]
    .split(':');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

/**
 * Generates initials from first and last name
 * @param {string} nom - Last name
 * @param {string} prenom - First name
 * @returns {string} Initials in uppercase, or '?' if missing
 */
export function getInitials(nom, prenom) {
  if (!nom || !prenom) return '?';
  return `${nom.charAt(0)}${prenom.charAt(0)}`.toUpperCase();
}

/**
 * Compresses and resizes an image to not exceed 100px by 100px
 * @param {File} file - Image file to compress and resize
 * @returns {Promise<File>} Promise resolving with compressed file
 */
export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxWidth = 100;
        const maxHeight = 100;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }, 'image/jpeg', 0.7);
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
