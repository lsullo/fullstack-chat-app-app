import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Schema } from '../../amplify/data/resource'
import { generateClient } from 'aws-amplify/api'

const client = generateClient<Schema>()
const GroupsPage = () => {
	const [rooms, setRooms] = useState<Schema['Room']['type'][]>([])
	const [groupName, setRoomName] = useState('')
	const navigate = useNavigate()
	useEffect(() => {
		client.models.Room.list().then((rooms) => {
			setRooms(rooms.data)
		})
	}, [])

	const handleCreateRoomSubmit = async (
		e: React.FormEvent<HTMLFormElement>
	) => {
		e.preventDefault()
		const urlName = groupName.toLowerCase().replace(/\s/g, '-')
		const { data: createdRoom } = await client.models.Room.create({
			name: groupName,
			urlName,
		})
		setRoomName('')

		setRooms([...rooms, createdRoom] as Schema['Room']['type'][])
		navigate(`/rooms/${urlName}`)
	}
	return (
		<>
			<h1 className="text-3xl text-center mt-12">Group Chat Rooms</h1>
			<div className="my-8 w-full">
				<div className="flex flex-col items-center">
					<form onSubmit={handleCreateRoomSubmit}>
						<input
							className="input input-md input-primary mr-2"
							placeholder="my cool group name"
							value={groupName}
							required
							onChange={(e) => {
								setRoomName(e.target.value)
							}}
						/>
						<button type="submit" className="btn btn-secondary">
							{' '}
							Create Group
						</button>
					</form>
				</div>
			</div>
			<section>
				{rooms.map((room) => (
					<article
						key={room.id}
						className="bg-accent rounded flex flex-col max-w-screen-md mx-auto p-4"
					>
						<Link
							className="text-2xl text-primary-content"
							to={`/rooms/${room.urlName}`}
						>
							<div className="h-24 flex justify-center items-center">
								{room.name}
							</div>
						</Link>
					</article>
				))}
			</section>
		</>
	)
}

export default GroupsPage
