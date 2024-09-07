import { Link } from 'react-router-dom'

const Hero = () => {
	return (
		<div className="hero min-h-screen bg-base-200">
			<div className="hero-content text-center">
				<div className="max-w-md">
					<h1 className="text-5xl font-bold">Wagwan Bossy</h1>
					<p className="py-6">
						I'm a pretty poor brokie hero element. That's ok. We all start somewhere!
						Right now I'm building something amazing ☦️
					</p>
					<Link to="/rooms" className="btn btn-primary">
						Public Chats
					</Link><Link to="/groups" className="btn btn-primary" style={{ marginLeft: '10px' }}>
						Group Chats
					</Link>
					
				</div>
			</div>
		</div>
	)
}

export default Hero
