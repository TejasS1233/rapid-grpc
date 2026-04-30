import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import jwt from 'jsonwebtoken';

const GATEWAY_ADDR = 'localhost:4000';
const JWT_SECRET = 'super-secret-key';

async function main() {
  // Load user proto
  const userProtoPath = path.join(__dirname, '..', 'proto', 'users.proto');
  const userPackageDef = protoLoader.loadSync(userProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const userProto = grpc.loadPackageDefinition(userPackageDef) as any;

  const userClient = new userProto.users.UserService(
    GATEWAY_ADDR,
    grpc.credentials.createInsecure()
  );

  // Generate a JWT token
  const token = jwt.sign({ sub: 'demo-user' }, JWT_SECRET, { expiresIn: '1h' });

  // Create metadata with auth
  const metadata = new grpc.Metadata();
  metadata.set('authorization', `Bearer ${token}`);

  // Test 1: List users
  console.log('\n--- Test 1: List Users ---');
  await new Promise<void>((resolve, reject) => {
    userClient.ListUsers({}, metadata, (err: any, response: any) => {
      if (err) {
        console.error('Error:', err.message);
        reject(err);
      } else {
        console.log('Users:', response.users);
        resolve();
      }
    });
  });

  // Test 2: Get specific user
  console.log('\n--- Test 2: Get User ---');
  await new Promise<void>((resolve, reject) => {
    userClient.GetUser({ id: '2' }, metadata, (err: any, response: any) => {
      if (err) {
        console.error('Error:', err.message);
        reject(err);
      } else {
        console.log('User:', response);
        resolve();
      }
    });
  });

  // Test 3: Without auth (should fail)
  console.log('\n--- Test 3: No Auth (should fail) ---');
  await new Promise<void>((resolve) => {
    userClient.ListUsers({}, new grpc.Metadata(), (err: any, response: any) => {
      if (err) {
        console.log('Expected error:', err.message);
      } else {
        console.log('Unexpected success');
      }
      resolve();
    });
  });

  // Test 4: With API key
  console.log('\n--- Test 4: API Key Auth ---');
  const apiKeyMetadata = new grpc.Metadata();
  apiKeyMetadata.set('x-api-key', 'demo-api-key-123');

  await new Promise<void>((resolve, reject) => {
    userClient.ListUsers({}, apiKeyMetadata, (err: any, response: any) => {
      if (err) {
        console.error('Error:', err.message);
        reject(err);
      } else {
        console.log('Users via API key:', response.users);
        resolve();
      }
    });
  });

  console.log('\nAll tests completed!');
}

main().catch(console.error);
