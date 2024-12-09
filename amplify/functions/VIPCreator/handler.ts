import { DynamoDB } from "aws-sdk";
import { APIGatewayProxyHandler } from "aws-lambda";

const dynamoDB = new DynamoDB.DocumentClient();

const userIndexTable = "UserIndex-zym4s5tojfekjijegwzlhfhur4-NONE"; // Replace with your actual table name

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    // Parse the request body
    const body = event.body ? JSON.parse(event.body) : {};
    const userId: string = body.userId;

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing 'userId' in request body." }),
      };
    }

    console.log("Updating user role to VIP for userId:", userId);

    // Update the user's role to VIP
    const updateParams: DynamoDB.DocumentClient.UpdateItemInput = {
      TableName: userIndexTable,
      Key: {
        userId: userId,
      },
      UpdateExpression: "SET #role = :vip",
      ExpressionAttributeNames: {
        "#role": "role", // Assuming 'role' is the attribute name
      },
      ExpressionAttributeValues: {
        ":vip": "VIP",
      },
      ReturnValues: "UPDATED_NEW",
    };


    const updateResult = await dynamoDB.update(updateParams).promise();

    console.log(
      "User role updated successfully:",
      JSON.stringify(updateResult, null, 2)
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `User ${userId} role updated to VIP successfully.`,
        updatedAttributes: updateResult.Attributes,
      }),
    };
  } catch (error) {
    console.error("Error updating user role:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal Server Error",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
