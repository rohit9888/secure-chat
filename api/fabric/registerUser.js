/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');


async function registerUser(userName, orgName, password) {
    try {
        // load the network configuration
        const ccpPath = path.resolve(__dirname, '..','..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new CA client for interacting with the CA.
        const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
        const ca = new FabricCAServices(caURL);

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check to see if we've already enrolled the user.
        const userIdentity = await wallet.get(userName);
        if (userIdentity) {
            // return {status: 403, message: "An identity for the user " + userName + " already exists in the wallet"};
            return {success: false, message: "An identity for the user " + userName + " already exists in the wallet"};
        }

        // Check to see if we've already enrolled the admin user.
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            // return {status: 400, message: "An identity for the admin user admin does not exist in the wallet. Please enroll admin via /enrollAdmin"};;
            return {success: false, message: "An identity for the admin user admin does not exist in the wallet. Please enroll admin via /enrollAdmin"};;
        }

        // build a user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // Register the user, enroll the user, and import the new identity into the wallet.
        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: userName,
            role: 'client',
            // password: password
        }, adminUser);
        const enrollment = await ca.enroll({
            enrollmentID: userName,
            enrollmentSecret: secret
        });
        const x509Identity = await{
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: orgName + 'MSP',
            password: password,
            type: 'X.509',
        };
        await wallet.put(userName, x509Identity);
        return {success: true, message: "Successfully registered and enrolled user " + userName + " and imported it into the wallet"}
        // return {status: 200, message: "Successfully registered and enrolled user " + userName + " and imported it into the wallet"}


     } catch (error) {
        console.error(`Failed to register user "${userName}": ${error}`);
       return {success: false, message: `Failed to register user "${userName}": ${error}`}
    }
}

exports.registerUser = registerUser
