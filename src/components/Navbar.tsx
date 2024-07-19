import { Link } from 'react-router-dom';

interface NavbarProps {
	user: any;
	signOut: () => void;
	fetchedUserNickname: string;
}

const Navbar: React.FC<NavbarProps> = ({ user, signOut, fetchedUserNickname }) => {
	return (
		<div className="navbar bg-primary text-primary-content justify-center">
			<div className="">
				<Link to="/" className="btn btn-ghost text-xl">
					LTM Chats (Being Built)
				</Link>
			</div>
			<div className="flex-1">
				<p className=" w-full text-center">Welcome {fetchedUserNickname}</p>
			</div>
			<div>
				<ul className="menu menu-horizontal px-1">
					<li>
						<Link to="/rooms">Chat Rooms (to be changed to DMs shortly)</Link>
					</li>

					{user && (
						<li>
							<button onClick={signOut}>Sign Out</button>
						</li>
					)}
				</ul>
			</div>
		</div>
	);
}

export default Navbar;
