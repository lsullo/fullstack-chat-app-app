import { DynamoDB } from "aws-sdk";
import { Handler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

const dynamoDB = new DynamoDB.DocumentClient();

const userIndexTable = "UserIndex-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupMessageTable = "GroupMessage-zym4s5tojfekjijegwzlhfhur4-NONE";

export const handler: Handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    // Extract client_reference_id from the event detail
    const userId = event.detail?.data?.object?.client_reference_id;

    if (!userId) {
      throw new Error("client_reference_id not found in the event data.");
    }

    console.log("Querying UserIndex table with userId:", userId);

    // Query the UserIndex table using the userId
    const userIndexParams = {
      TableName: userIndexTable,
      Key: { id: userId }, // Correct partition key
    };

    const userResult = await dynamoDB.query(userIndexParams).promise();

    console.log("UserIndex Query Result:", JSON.stringify(userResult, null, 2));

    // Ensure we found a matching record and it has a recentgroup
    if (!userResult.Items || userResult.Items.length === 0 || !userResult.Items[0].recentgroup) {
      throw new Error("Recent group not found for the user.");
    }

    const recentGroupUrl = userResult.Items[0].recentgroup;

    // Extract the groupId from the recent group URL
    const groupIdMatch = recentGroupUrl.match(/groups\/([^/]+)/);

    if (!groupIdMatch || groupIdMatch.length < 2) {
      throw new Error("Invalid recent group URL format.");
    }

    const groupId = groupIdMatch[1];
    console.log("Extracted groupId:", groupId);

    // Generate a unique ID for the group message
    const newMessageId = uuidv4();

    const newMessage = {
      id: newMessageId, // Unique partition key
      groupId,
      content: `ACP ACTIVATED ANTI_GAY ON`,
      userNickname: "LTM",
      type: "system",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log("New group message payload:", newMessage);

    const groupMessageParams = {
      TableName: groupMessageTable,
      Item: newMessage,
    };

    // Insert the new message into the GroupMessage table
    await dynamoDB.put(groupMessageParams).promise();

    console.log("Group message added successfully:", newMessage);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Group message inserted successfully",
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
