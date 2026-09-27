function getUintBigEndian(array, offset, count, bits = 8) {
  let number = 0;

  for (let i = 0; i < count; i++) {
    number |= (array[offset + i] << ((count - 1 - i) * bits));
  }
  
  number >>>= 0;

  return number;
}

export { getUintBigEndian };