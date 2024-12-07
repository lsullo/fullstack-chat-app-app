import { DynamoDB } from "aws-sdk";
import { Handler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

const dynamoDB = new DynamoDB.DocumentClient();

const userIndexTable = "UserIndex-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupMessageTable = "GroupMessage-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupTable = "Group-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupUserTable = "GroupUser-zym4s5tojfekjijegwzlhfhur4-NONE";

const usertobeaddeduserid = "914b9510-f021-701b-0ffb-e1650f8377ef";

export const handler: Handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const userId = event.detail?.data?.object?.client_reference_id;
    const checkoutId = event.detail?.data?.object?.id;

    if (!userId) {
      throw new Error("client_reference_id not found in the event data.");
    }
    
    if (!checkoutId) {
      throw new Error("checkoutId not found in the event data.");
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
      Key: {
        id: groupId,
      },
      UpdateExpression: "SET checkoutId = :checkoutId, chatstatus = :activated",
      ExpressionAttributeValues: {
        ":checkoutId": checkoutId,
        ":activated": "Activated",
      },
      ReturnValues: "UPDATED_NEW",
    };

    const updateGroupResult = await dynamoDB.update(updateGroupParams).promise();

    console.log(
      "Group chat status updated successfully:",
      JSON.stringify(updateGroupResult, null, 2)
    );

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

    const newGroupUser = {
      id: groupUserId,
      groupId: groupId,
      userId: usertobeaddeduserid,
      role: "member",
      userNickname: userNickname,
      email: email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const groupUserParams = {
      TableName: groupUserTable,
      Item: newGroupUser,
    };

    await dynamoDB.put(groupUserParams).promise();

    console.log("Group user added successfully:", newGroupUser);

    const newMessageId2 = uuidv4();

    const newMessage2 = {
      id: newMessageId2,
      groupId,
      content: `Hello I am your lawyer... `,
      userNickname: newGroupUser.userNickname,
      type: "text",
      owner: usertobeaddeduserid,
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
