/* tslint:disable */
/* eslint-disable */
/**
 * Test swagger
 * Testing the Fastify swagger API
 *
 * The version of the OpenAPI document: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
/**
 * 
 * @export
 * @interface VideoVideoIdSubscribePostRequest
 */
export interface VideoVideoIdSubscribePostRequest {
    /**
     * 
     * @type {boolean}
     * @memberof VideoVideoIdSubscribePostRequest
     */
    isUserSubscribed: boolean;
}

/**
 * Check if a given object implements the VideoVideoIdSubscribePostRequest interface.
 */
export function instanceOfVideoVideoIdSubscribePostRequest(value: object): value is VideoVideoIdSubscribePostRequest {
    if (!('isUserSubscribed' in value) || value['isUserSubscribed'] === undefined) return false;
    return true;
}

export function VideoVideoIdSubscribePostRequestFromJSON(json: any): VideoVideoIdSubscribePostRequest {
    return VideoVideoIdSubscribePostRequestFromJSONTyped(json, false);
}

export function VideoVideoIdSubscribePostRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): VideoVideoIdSubscribePostRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'isUserSubscribed': json['isUserSubscribed'],
    };
}

export function VideoVideoIdSubscribePostRequestToJSON(json: any): VideoVideoIdSubscribePostRequest {
    return VideoVideoIdSubscribePostRequestToJSONTyped(json, false);
}

export function VideoVideoIdSubscribePostRequestToJSONTyped(value?: VideoVideoIdSubscribePostRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'isUserSubscribed': value['isUserSubscribed'],
    };
}

