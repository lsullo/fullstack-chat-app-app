import { DynamoDB } from "aws-sdk";
import { Handler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

const dynamoDB = new DynamoDB.DocumentClient();

const userIndexTable = "UserIndex-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupMessageTable = "GroupMessage-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupTable = "Group-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupUserTable = "GroupUser-zym4s5tojfekjijegwzlhfhur4-NONE";

const usertobeaddeduserid = "913b3560-e091-7009-9862-dff786bf32e4";

export const handler: Handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const userId = event.detail?.data?.object?.client_reference_id;

    if (!userId) {
      throw new Error("client_reference_id not found in the event data.");
    }

    console.log("Querying UserIndex table with userId:", userId);

    // Query to get the recent group URL
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

    // Extract groupId from the recent group URL
    const groupIdMatch = recentGroupUrl.match(/groups\/([^/]+)/);

    if (!groupIdMatch || groupIdMatch.length < 2) {
      throw new Error("Invalid recent group URL format.");
    }

    const groupId = groupIdMatch[1];
    console.log("Extracted groupId:", groupId);

    // Update the group's chat status to 'Activated'
    const updateGroupParams = {
      TableName: groupTable,
      Key: {
        id: groupId,
      },
      UpdateExpression: "SET chatstatus = :activated",
      ExpressionAttributeValues: {
        ":activated": "Activated",
      },
      ReturnValues: "UPDATED_NEW",
    };

    const updateGroupResult = await dynamoDB.update(updateGroupParams).promise();

    console.log(
      "Group chat status updated successfully:",
      JSON.stringify(updateGroupResult, null, 2)
    );

    // Create the first group message
    const newMessageId1 = uuidv4();

    const newMessage1 = {
      id: newMessageId1,
      groupId,
      content: `Attorney Client Privilege Activated`,
      userNickname: "LTM",
      type: "system",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const groupMessageParams1 = {
      TableName: groupMessageTable,
      Item: newMessage1,
    };

    await dynamoDB.put(groupMessageParams1).promise();

    console.log("Group message added successfully:", newMessage1);

    // Query to get the user data for the user to be added
    const userToAddParams = {
      TableName: userIndexTable,
      IndexName: "userIndicesByUserId",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": usertobeaddeduserid,
      },
    };

    const userToAddResult = await dynamoDB.query(userToAddParams).promise();

    if (!userToAddResult.Items || userToAddResult.Items.length === 0) {
      throw new Error("User to be added not found with the provided userId.");
    }

    const userToAddItem = userToAddResult.Items[0];

    const userNickname =
      userToAddItem.userNickname ||
      userToAddItem.nickname ||
      "Unknown User";
    const email = userToAddItem.email || "unknown@example.com";

    const groupUserId = uuidv4();

    // Create a new GroupUser entry
    const newGroupUser = {
      id: groupUserId,
      groupId: groupId,
      userId: usertobeaddeduserid,
      role: "member",
      userNickname: userNickname,
      email: email,
    };

    const groupUserParams = {
      TableName: groupUserTable,
      Item: newGroupUser,
    };

    await dynamoDB.put(groupUserParams).promise();

    console.log("Group user added successfully:", newGroupUser);

    // Create a new group message using the new GroupUser
    const newMessageId2 = uuidv4();

    const newMessage2 = {
      id: newMessageId2,
      groupId,
      content: `Hello I am your lawyer... `,
      userNickname: newGroupUser.userNickname,
      type: "text",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const groupMessageParams2 = {
      TableName: groupMessageTable,
      Item: newMessage2,
    };

    await dynamoDB.put(groupMessageParams2).promise();

    console.log("Group message 2 added successfully:", newMessage2);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Group user and messages inserted successfully",
        newGroupUser,
        newMessage1,
        newMessage2,
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
