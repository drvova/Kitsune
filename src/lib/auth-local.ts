// LocalStorage-based authentication utilities

export interface LocalUser {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  autoSkip: boolean;
  createdAt: string;
}

export interface AuthData {
  user: LocalUser | null;
  token: string | null;
}

const STORAGE_KEY = 'kitsune_auth';

// Generate a simple ID for local users
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Hash password using SHA-256
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Verify password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Get current auth data from localStorage
export function getAuthData(): AuthData {
  if (typeof window === 'undefined') {
    return { user: null, token: null };
  }
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return { user: null, token: null };
    
    const parsed = JSON.parse(data);
    return {
      user: parsed.user,
      token: parsed.token
    };
  } catch {
    return { user: null, token: null };
  }
}

// Save auth data to localStorage
export function saveAuthData(user: LocalUser, token: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      user,
      token
    }));
  } catch (error) {
    console.error('Failed to save auth data:', error);
  }
}

// Clear auth data from localStorage
export function clearAuthData(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear auth data:', error);
  }
}

// Get all registered users (for demo purposes)
export function getAllUsers(): LocalUser[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const users = localStorage.getItem('kitsune_users');
    return users ? JSON.parse(users) : [];
  } catch {
    return [];
  }
}

// Save users to localStorage
export function saveUsers(users: LocalUser[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('kitsune_users', JSON.stringify(users));
  } catch (error) {
    console.error('Failed to save users:', error);
  }
}

// Login with username/password
export async function login(username: string, password: string): Promise<{ success: boolean; user?: LocalUser; error?: string }> {
  const users = getAllUsers();
  const user = users.find(u => u.username === username);
  
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  
  // Verify hashed password
  const userPasswords = JSON.parse(localStorage.getItem('kitsune_passwords') || '{}');
  const storedHash = userPasswords[user.id];
  
  if (!storedHash) {
    return { success: false, error: 'User not found' };
  }
  
  const isPasswordValid = await verifyPassword(password, storedHash);
  
  if (!isPasswordValid) {
    return { success: false, error: 'Invalid password' };
  }
  
  const token = generateId();
  saveAuthData(user, token);
  
  return { success: true, user };
}

// Signup new user
export async function signup(username: string, email: string, password: string): Promise<{ success: boolean; user?: LocalUser; error?: string }> {
  const users = getAllUsers();
  
  // Check if username already exists
  if (users.some(u => u.username === username)) {
    return { success: false, error: 'Username already exists' };
  }
  
  // Check if email already exists
  if (users.some(u => u.email === email)) {
    return { success: false, error: 'Email already exists' };
  }
  
  const newUser: LocalUser = {
    id: generateId(),
    username,
    email,
    autoSkip: false,
    createdAt: new Date().toISOString()
  };
  
  // Hash password before storing
  const hashedPassword = await hashPassword(password);
  
  // Save user
  users.push(newUser);
  saveUsers(users);
  
  // Save hashed password
  const passwords = JSON.parse(localStorage.getItem('kitsune_passwords') || '{}');
  passwords[newUser.id] = hashedPassword;
  localStorage.setItem('kitsune_passwords', JSON.stringify(passwords));
  
  const token = generateId();
  saveAuthData(newUser, token);
  
  return { success: true, user: newUser };
}

// Logout
export function logout(): void {
  clearAuthData();
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  const auth = getAuthData();
  return auth.user !== null && auth.token !== null;
}

// Get current user
export function getCurrentUser(): LocalUser | null {
  const auth = getAuthData();
  return auth.user;
}

// Migrate existing plain text passwords to hashed passwords
export async function migratePasswords(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    const passwords = JSON.parse(localStorage.getItem('kitsune_passwords') || '{}');
    let needsMigration = false;
    
    // Check if any passwords are not hashed (SHA-256 produces 64 character hex strings)
    for (const [, password] of Object.entries(passwords)) {
      if (typeof password === 'string' && password.length !== 64) {
        needsMigration = true;
        break;
      }
    }
    
    if (!needsMigration) return;
    
    console.log('Migrating passwords to hashed format...');
    
    // Hash all plain text passwords
    for (const [userId, password] of Object.entries(passwords)) {
      if (typeof password === 'string' && password.length !== 64) {
        passwords[userId] = await hashPassword(password);
      }
    }
    
    localStorage.setItem('kitsune_passwords', JSON.stringify(passwords));
    console.log('Password migration completed.');
  } catch (error) {
    console.error('Failed to migrate passwords:', error);
  }
}