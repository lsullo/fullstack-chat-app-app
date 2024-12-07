import { DynamoDB } from "aws-sdk";
import { Handler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

const dynamoDB = new DynamoDB.DocumentClient();

const userIndexTable = "UserIndex-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupMessageTable = "GroupMessage-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupTable = "Group-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupUserTable = "GroupUser-zym4s5tojfekjijegwzlhfhur4-NONE";

const usertoberemoveduserid = "914b9510-f021-701b-0ffb-e1650f8377ef";

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
      IndexName: "userIndicesByUserId",
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

    const userItem = userResult.Items[0];
    const recentGroupUrl = userItem.recentgroup;
    const groupIdMatch = recentGroupUrl.match(/groups\/([^/]+)/);

    if (!groupIdMatch || groupIdMatch.length < 2) {
      throw new Error("Invalid recent group URL format.");
    }

    const groupId = groupIdMatch[1];
    console.log("Extracted groupId:", groupId);

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
      content: `Attorney Client Privilege deactivated`,
      userNickname: "LTM",
      type: "system",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const groupMessageParams = {
      TableName: groupMessageTable,
      Item: newMessage,
    };

    await dynamoDB.put(groupMessageParams).promise();
    console.log("Group message added successfully:", newMessage);

    // Remove the specified user from the group if they exist
    const groupUserToRemoveParams = {
      TableName: groupUserTable,
      IndexName: "groupUsersByUserIdIndex", // Replace with your actual index name
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": usertoberemoveduserid,
      },
    };

    const groupUserToRemoveResult = await dynamoDB.query(groupUserToRemoveParams).promise();
    const userToRemoveItem = groupUserToRemoveResult.Items
      ? groupUserToRemoveResult.Items.find((item) => item.groupId === groupId)
      : undefined;

    if (userToRemoveItem) {
      const deleteParams = {
        TableName: groupUserTable,
        Key: {
          id: userToRemoveItem.id,
        },
      };
      await dynamoDB.delete(deleteParams).promise();
      console.log("User removed from the group successfully:", usertoberemoveduserid);
    } else {
      console.log("User to remove not found in the group:", usertoberemoveduserid);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Attorney client privilege deactivated and user removal attempted.",
        newMessage,
      }),
    };
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error processing request", error }),
    };
  }
};
