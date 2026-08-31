'use client';
/* 用户与角色上下文：演示环境角色切换（学生/教师/管理员/家长），权限控制依据 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getCurrentUser, setCurrentUser, User } from './client';

type Ctx = {
  user: User;
  users: User[];
  switchUser: (u: User) => void;
  loading: boolean;
};

const UserContext = createContext<Ctx>({
  user: getCurrentUser(),
  users: [],
  switchUser: () => {},
  loading: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(getCurrentUser());
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth')
      .then((r) => r.json())
      .then((rows: any[]) => {
        setUsers(rows);
        // 若当前用户不在列表中则回退默认
        setUser((cur) => (rows.some((r) => r.id === cur.id) ? cur : rows[0] ?? cur));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const switchUser = useCallback((u: User) => {
    setCurrentUser(u);
    setUser(u);
  }, []);

  return <UserContext.Provider value={{ user, users, switchUser, loading }}>{children}</UserContext.Provider>;
}

export const useUser = () => useContext(UserContext);

/** 菜单级权限：某角色可见的导航 */
export const ROLE_HOME: Record<string, string> = {
  student: '/dashboard',
  teacher: '/dashboard/admin',
  admin: '/dashboard/admin',
  parent: '/dashboard/analytics',
};
