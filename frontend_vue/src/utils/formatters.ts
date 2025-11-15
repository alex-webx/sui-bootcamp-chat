import moment from 'moment';

export const shortenAddress = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

export const formatDate = (date: string | number) => moment(typeof date === 'string' ? Number(date) : date).format('DD/MM/YYYY');
export const formatTime = (date: string | number) => moment(typeof date === 'string' ? Number(date) : date).format('HH[h]mm');
export const formatFullDate = (date: string) => `${formatDate(date)} [às] ${formatTime('HH:MM:ss')}`;

export const randomColor = (address: string) => {
  let min = 30;
  let max = 225;

  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }

  const range = max - min;

  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    const softValue = Math.floor((value / 255) * range) + min;
    color += softValue.toString(16).padStart(2, '0');
  }

  return color;
};

export default {
  shortenAddress,

  formatDate,
  formatTime,
  formatFullDate,

  randomColor
};
