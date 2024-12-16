import { DynamoDB } from "aws-sdk";
import { Handler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

const dynamoDB = new DynamoDB.DocumentClient();

const userIndexTable = "UserIndex-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupMessageTable = "GroupMessage-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupTable = "Group-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupUserTable = "GroupUser-zym4s5tojfekjijegwzlhfhur4-NONE";


const usertoberemoveduserid = "914b9510-f021-701b-0ffb-e1650f8377ef";

const userIndexByUserIdIndex = "userIndicesByUserId"; 
const groupUserByUserIdIndex = "groupUsersByUserId"; 

export const handler: Handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const userId = event.detail?.data?.object?.client_reference_id;
    if (!userId) {
      throw new Error("client_reference_id not found in the event data.");
    }

    console.log("Querying UserIndex table with userId:", userId);
    const userIndexParams = {
      TableName: userIndexTable,
      IndexName: userIndexByUserIdIndex,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    };

    const userResult = await dynamoDB.query(userIndexParams).promise();
    console.log("UserIndex Query Result:", JSON.stringify(userResult, null, 2));

    if (!userResult.Items || userResult.Items.length === 0) {
      throw new Error("User not found with the provided userId.");
    }

    const groupUserParams = {
      TableName: groupUserTable,
      IndexName: groupUserByUserIdIndex,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    };

    const groupUserResult = await dynamoDB.query(groupUserParams).promise();
    console.log("GroupUser query result for unsubscribed user:", JSON.stringify(groupUserResult, null, 2));

    const groupUserItems = groupUserResult.Items || [];
    if (groupUserItems.length === 0) {
      console.log("This user is not a member of any groups. Nothing to update.");
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "No groups found for this user." }),
      };
    }

    for (const gu of groupUserItems) {
      if (gu.role !== 'admin') {
        console.log(`Skipping group ${gu.groupId} because user is not an admin`);
        continue;
      }

      const groupId = gu.groupId;
      console.log(`Processing groupId: ${groupId} as user is an admin`);

      const updateGroupParams = {
        TableName: groupTable,
        Key: { id: groupId },
        UpdateExpression: "SET chatstatus = :def",
        ExpressionAttributeValues: {
          ":def": "Def",
        },
        ReturnValues: "UPDATED_NEW",
      };

      const updateGroupResult = await dynamoDB.update(updateGroupParams).promise();
      console.log("Group chat status updated successfully:", JSON.stringify(updateGroupResult, null, 2));

      const newMessageId = uuidv4();
      const newMessage = {
        id: newMessageId,
        groupId,
        content: "Attorney Client Privilege deactivated",
        userNickname: "System",
        type: "system",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const groupMessageParams = {
        TableName: groupMessageTable,
        Item: newMessage,
      };

      await dynamoDB.put(groupMessageParams).promise();
      console.log("System message added successfully:", newMessage);

      const lawyerGroupUserParams = {
        TableName: groupUserTable,
        IndexName: groupUserByUserIdIndex,
        KeyConditionExpression: "userId = :lawyerUserId",
        ExpressionAttributeValues: {
          ":lawyerUserId": usertoberemoveduserid,
        },
      };

      const lawyerGroupUserResult = await dynamoDB.query(lawyerGroupUserParams).promise();
      console.log("GroupUser query result for lawyer removal:", JSON.stringify(lawyerGroupUserResult, null, 2));

      const lawyerInThisGroup = lawyerGroupUserResult.Items
        ? lawyerGroupUserResult.Items.find((item) => item.groupId === groupId)
        : undefined;

      if (lawyerInThisGroup) {
        const deleteParams = {
          TableName: groupUserTable,
          Key: {
            id: lawyerInThisGroup.id,
          },
        };
        await dynamoDB.delete(deleteParams).promise();
        console.log("Lawyer user removed from the group successfully:", usertoberemoveduserid);
      } else {
        console.log("Lawyer user not found in this group:", usertoberemoveduserid);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "All applicable groups updated (only those where user is admin), attorney-client privilege deactivated, and lawyer removal attempted where applicable.",
      }),
    };

  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error processing request", error: (error as Error).message }),
    };
  }
};
