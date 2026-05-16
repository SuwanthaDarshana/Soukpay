import { Redirect } from 'expo-router';
import { useAppSelector } from '../store';

export default function Index() {
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}
