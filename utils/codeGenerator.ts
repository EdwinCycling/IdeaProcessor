export const generateSessionCode = (): string => {
  // Generate a random 6-character code (uppercase letters and numbers)
  // Exclude confusing characters like I, 1, O, 0
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};
