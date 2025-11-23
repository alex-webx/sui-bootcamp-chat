import moment from 'moment';
import Decimal from 'decimal.js';

export const shortenAddress = (addr: string | undefined | null) => addr ? `${addr?.slice(0, 6)}...${addr?.slice(-4)}` : '';

export const formatDate = (date: string | number) => moment(typeof date === 'string' ? Number(date) : date).format('DD/MM/YYYY');
export const formatTime = (date: string | number) => moment(typeof date === 'string' ? Number(date) : date).format('HH[h]mm');
export const formatFullDate = (date: string) => `${formatDate(date)} ${formatTime(date)}`;

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

export const formatCoinBalance = (
  balanceInMist: BigInt,
  coinDecimals: number = 9,
  displayDecimals?: number // Parâmetro para a precisão solicitada
): string => {
  const balanceDecimal = new Decimal(balanceInMist.toString());
  const factor = new Decimal(10).pow(coinDecimals);
  const result = balanceDecimal.div(factor);

  if (displayDecimals !== undefined) {
    // Retorna o número com o número fixo de casas decimais, arredondando conforme necessário.
    return result.toFixed(displayDecimals);
  }

  // Caso contrário, retorna o valor completo, removendo zeros à direita automaticamente.
  return result.toString();
};

export default {
  shortenAddress,

  formatDate,
  formatTime,
  formatFullDate,

  formatCoinBalance,

  randomColor
};
