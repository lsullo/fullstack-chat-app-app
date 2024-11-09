import { Link } from 'react-router-dom'

const Hero = () => {
	return (
		<div className="hero min-h-screen bg-base-200">
			<div className="hero-content text-center">
				<div className="max-w-md">
					<h1 className="text-2xl font-bold"> Recent Updates/Announcements:</h1>
					<p className="py-6">
						 Working on getting the L chats working ☦️
					</p>
					<Link to="/groups" className="btn btn-primary" style={{ marginLeft: '10px' }}>
						Group Chats
					</Link>
				</div>
			</div>
		</div>
	)
}

export default Hero
