import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useEffect, useState } from 'react';

export default function RootLayout() {
	const { user, signOut } = useAuthenticator((context) => [context.user]);
	const [fetchedUserNickname, setFetchedUserNickname] = useState<string>('');

	useEffect(() => {
		if (user) {
			fetchAuthSession().then((session) => {
				setFetchedUserNickname(session.tokens?.idToken?.payload.nickname as string);
			});
		} else {
			setFetchedUserNickname('');
		}
	}, [user]);

	return (
		<div className="flex flex-col h-screen">
			<header className="header">
				<Navbar user={user} signOut={signOut} fetchedUserNickname={fetchedUserNickname} />
			</header>
			<main className="flex-1">
				<Outlet />
			</main>
			<Footer />
		</div>
	);
}
