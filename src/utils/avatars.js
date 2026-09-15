/**
 * Q版头像数据与本地读写
 * 头像本体是矢量绘制的（见 components/PlayerAvatar.vue），这里只放"怎么画"的参数
 * ear 决定耳朵剪影，mark 是额外装饰（眼圈、条纹、猪鼻…），配色给出毛色、浅色区、描边色
 */
import { readJSON, writeJSON } from './storage.js';

export const AVATAR_KEY = 'dsh-24dian:avatar';
export const DEFAULT_AVATAR_ID = 'fox';

export const AVATARS = [
  { id: 'fox', name: '小狐狸', ear: 'pointy', fur: '#F59E0B', light: '#FEF3C7', dark: '#7C2D12' },
  { id: 'cat', name: '小猫', ear: 'pointy', fur: '#CBD5E1', light: '#F8FAFC', dark: '#475569' },
  { id: 'dog', name: '小狗', ear: 'floppy', fur: '#D6A461', light: '#FDF6E3', dark: '#78350F' },
  { id: 'rabbit', name: '小兔子', ear: 'long', fur: '#F8FAFC', light: '#FFFFFF', dark: '#DB2777' },
  { id: 'panda', name: '小熊猫', ear: 'round', fur: '#FFFFFF', light: '#F1F5F9', dark: '#1E293B', mark: 'eyepatch' },
  { id: 'bear', name: '小熊', ear: 'round', fur: '#C2853F', light: '#FDE68A', dark: '#78350F' },
  { id: 'tiger', name: '小老虎', ear: 'round', fur: '#FBBF24', light: '#FEF3C7', dark: '#92400E', mark: 'stripe' },
  { id: 'frog', name: '小青蛙', ear: 'none', fur: '#86EFAC', light: '#DCFCE7', dark: '#15803D', mark: 'frog' },
  { id: 'penguin', name: '小企鹅', ear: 'none', fur: '#334155', light: '#FFFFFF', dark: '#F97316', mark: 'beak' },
  { id: 'pig', name: '小猪', ear: 'small', fur: '#FBCFE8', light: '#FDF2F8', dark: '#BE185D', mark: 'snout' },
  { id: 'lion', name: '小狮子', ear: 'round', fur: '#FCD34D', light: '#FEF9C3', dark: '#B45309', mark: 'mane' },
  { id: 'unicorn', name: '独角兽', ear: 'pointy', fur: '#E9D5FF', light: '#F5F3FF', dark: '#7E22CE', mark: 'horn' },
];

/** 按 id 取头像配置，未知 id 一律回落到默认（小狐狸） */
export function getAvatar(id) {
  return (
    AVATARS.find((item) => item.id === id) ||
    AVATARS.find((item) => item.id === DEFAULT_AVATAR_ID)
  );
}

/** 读取本机保存的头像 id：空或非法都回到默认值 */
export function loadAvatar(storage, defaultId = DEFAULT_AVATAR_ID) {
  const raw = readJSON(AVATAR_KEY, null, storage);
  const id = typeof raw === 'string' ? raw : '';
  return AVATARS.some((item) => item.id === id) ? id : defaultId;
}

/** 保存头像 id：非法 id 存默认值，写入失败也不抛错 */
export function saveAvatar(id, storage) {
  const value = AVATARS.some((item) => item.id === id) ? id : DEFAULT_AVATAR_ID;
  writeJSON(AVATAR_KEY, value, storage);
  return value;
}
