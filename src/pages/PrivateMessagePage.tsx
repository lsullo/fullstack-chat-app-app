import { FormEvent, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Schema } from '../../amplify/data/resource'
import { generateClient } from 'aws-amplify/api'
import clsx from 'clsx'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { uploadData } from 'aws-amplify/storage'
import { StorageImage } from '@aws-amplify/ui-react-storage'
import { fetchAuthSession } from 'aws-amplify/auth'
import { Link } from 'react-router-dom'

const client = generateClient<Schema>()

function formatTime(dateString: string): string {
   const date = new Date(dateString)

   const formatter = new Intl.DateTimeFormat('en-US', {
       hour: 'numeric',
       minute: 'numeric',
       hour12: true,
   })

   return formatter.format(date)
}

const PrivateMessagePage = () => {
   const { user } = useAuthenticator((context) => [context.user])
   const [userNickname, setUserNickname] = useState('')
   const { groupName } = useParams()
   const fileInputRef = useRef<HTMLInputElement | null>(null)

   const [groupDetails, setGroupDetails] = useState<{
       groupId: string
       groupname: string
   }>()
   const [msgText, setMsgText] = useState('')
   const [msgFile, setMsgFile] = useState<File | null>(null)
   const [msgs, setMsgs] = useState<Schema['GroupMessage']['type'][]>([])
   const [fetchedUserId, setFetchedUserId] = useState('')
   const [isUserInGroup, setIsUserInGroup] = useState(true)
   const [loading, setLoading] = useState(true)  // New loading state

   // Fetch Authenticated User Session
   useEffect(() => {
      if (user) {
         fetchAuthSession().then((session) => {
            setFetchedUserId(session.tokens?.idToken?.payload.sub as string)
         })
      } else {
         setFetchedUserId('')
      }
   }, [user])

   // Check if the authenticated user is part of the group
   useEffect(() => {
      const fetchGroupUsers = async () => {
         if (groupDetails?.groupId && fetchedUserId) {
            try {
               const groupUserResponse = await client.models.GroupUser.list({
                  filter: { groupId: { eq: groupDetails.groupId } },
               })

               const isUserInGroup = groupUserResponse.data.some(
                  (groupUser) => groupUser.userId === fetchedUserId
               )

               setIsUserInGroup(isUserInGroup)
               setLoading(false)  // Stop loading after the check is done
            } catch (error) {
               console.error('Error fetching group users:', error)
               setLoading(false)  // Ensure loading stops even on error
            }
         }
      }

      if (groupDetails?.groupId) {
         fetchGroupUsers()
      }
   }, [groupDetails, fetchedUserId])

   useEffect(() => {
      if (!groupName) return
      client.models.Group.listGroupByGroupUrlName(
         { groupUrlName: groupName },
         {
            selectionSet: ['id', 'groupname', 'messages.*'],
         }
      ).then(({ data }) => {
         data[0].messages.sort(
            (a, b) =>
               new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
         )
         setMsgs(data[0].messages as Schema['GroupMessage']['type'][])
         setGroupDetails({
            groupId: data[0].id,
            groupname: data[0].groupname,
         })
      })
   }, [groupName])

   useEffect(() => {
      fetchAuthSession().then((user2) => {
         setUserNickname(user2.tokens?.idToken?.payload['nickname'] as string)
      })
   }, [])

   const handleSubmit = async (e: FormEvent) => {
      e.preventDefault()

      if (msgText) {
         const { data: newMessage } = await client.models.GroupMessage.create({
            groupId: groupDetails?.groupId as string,
            type: 'text',
            content: msgText,
            userNickname,
         })
         setMsgs((prev) => [...prev, { ...newMessage }] as Schema['GroupMessage']['type'][])
         setMsgText('')
      }

      if (msgFile) {
         const uploadedItem = await uploadData({
            data: msgFile,
            path: `chat-pics/${msgFile.name}`,
         }).result

         const filePath = uploadedItem.path

         console.log('Uploaded file path:', filePath)

         const { data: newMessage } = await client.models.GroupMessage.create({
            groupId: groupDetails?.groupId as string,
            type: 'image',
            content: filePath,
            userNickname,
         })

         setMsgs((prev) => [...prev, { ...newMessage }] as Schema['GroupMessage']['type'][])
         setMsgFile(null)
         if (fileInputRef.current) {
            fileInputRef.current.value = ''
         }
      }
   }


   if (loading) {
      return (
         <div className="flex justify-center items-center h-screen">
            <h1 className="text-2xl">Checking Authorization...</h1>
         </div>
      )
   }

   if (!isUserInGroup) {
      return (
    <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
            <div className="max-w-md">
                <h1 className="text-3xl font-bold text-red-600"> Not yo CHAT DumbAsS</h1>
                <Link to="/" className="btn btn-primary">Home</Link>  
            </div>
        </div>
        </div>
      )
   }

   return (
      <div className="flex flex-col h-screen">
         <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {msgs.map((msg) => (
               <div
                  key={msg.id}
                  className={clsx(
                     'w-full flex',
                     msg.owner !== user.username ? 'justify-start' : 'justify-end'
                  )}
               >
                  {msg.content && (
                     <div
                        className={clsx(
                           'chat max-w-xl w-1/3',
                           msg.owner !== user.username ? 'chat-start' : 'chat-end'
                        )}
                     >
                        <div className="chat-header">
                           {msg.userNickname}
                           <time className="text-xs opacity-50">
                              {formatTime(msg.createdAt)}
                           </time>
                        </div>
                        <p
                           className={clsx(
                              'chat-bubble',
                              msg.owner !== user.username
                                 ? 'chat-bubble-accent'
                                 : 'chat-bubble-info'
                           )}
                        >
                           {msg.content}
                        </p>
                     </div>
                  )}
                  {msg.picId && (
                     <div
                        className={clsx(
                           'chat max-w-xl w-1/3',
                           msg.owner !== user.username ? 'chat-start' : 'chat-end'
                        )}
                     >
                        <div className="chat-header">
                           {msg.userNickname}
                           <time className="text-xs opacity-50">
                              {formatTime(msg.createdAt)}
                           </time>
                        </div>
                        <StorageImage
                           path={msg.picId}
                           alt=""
                           className={clsx(
                              'chat-bubble',
                              msg.owner !== user.username
                                 ? 'chat-bubble-accent'
                                 : 'chat-bubble-info'
                           )}
                        />
                     </div>
                  )}
               </div>
            ))}
         </div>
         <form onSubmit={handleSubmit} className="bg-info py-4 px-6 flex items-center">
            <input
               className="flex-1 input"
               placeholder="Type your message..."
               type="text"
               value={msgText}
               onChange={(e) => setMsgText(e.target.value)}
            />
            <input
               type="file"
               ref={fileInputRef}
               onChange={(e) => e.target.files && setMsgFile(e.target.files[0])}
               className="file-input file-input-bordered file-input-primary w-full max-w-xs mx-4"
            />
            <button type="submit" className="btn btn-secondary">
               Send
            </button>
         </form>
      </div>
   )
}

export default PrivateMessagePage
