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
 * @interface VideoVideoIdGet200Response
 */
export interface VideoVideoIdGet200Response {
    /**
     * 
     * @type {string}
     * @memberof VideoVideoIdGet200Response
     */
    id: string;
    /**
     * 
     * @type {string}
     * @memberof VideoVideoIdGet200Response
     */
    userId: string;
    /**
     * 
     * @type {string}
     * @memberof VideoVideoIdGet200Response
     */
    title: string;
    /**
     * 
     * @type {string}
     * @memberof VideoVideoIdGet200Response
     */
    description: string;
    /**
     * 
     * @type {Date}
     * @memberof VideoVideoIdGet200Response
     */
    uploadDate: Date;
    /**
     * 
     * @type {number}
     * @memberof VideoVideoIdGet200Response
     */
    likes: number;
    /**
     * 
     * @type {boolean}
     * @memberof VideoVideoIdGet200Response
     */
    userHasLiked: boolean;
    /**
     * 
     * @type {number}
     * @memberof VideoVideoIdGet200Response
     */
    views: number;
    /**
     * 
     * @type {Array<string>}
     * @memberof VideoVideoIdGet200Response
     */
    moderationTypes: Array<string>;
}

/**
 * Check if a given object implements the VideoVideoIdGet200Response interface.
 */
export function instanceOfVideoVideoIdGet200Response(value: object): value is VideoVideoIdGet200Response {
    if (!('id' in value) || value['id'] === undefined) return false;
    if (!('userId' in value) || value['userId'] === undefined) return false;
    if (!('title' in value) || value['title'] === undefined) return false;
    if (!('description' in value) || value['description'] === undefined) return false;
    if (!('uploadDate' in value) || value['uploadDate'] === undefined) return false;
    if (!('likes' in value) || value['likes'] === undefined) return false;
    if (!('userHasLiked' in value) || value['userHasLiked'] === undefined) return false;
    if (!('views' in value) || value['views'] === undefined) return false;
    if (!('moderationTypes' in value) || value['moderationTypes'] === undefined) return false;
    return true;
}

export function VideoVideoIdGet200ResponseFromJSON(json: any): VideoVideoIdGet200Response {
    return VideoVideoIdGet200ResponseFromJSONTyped(json, false);
}

export function VideoVideoIdGet200ResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): VideoVideoIdGet200Response {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'],
        'userId': json['userId'],
        'title': json['title'],
        'description': json['description'],
        'uploadDate': (new Date(json['uploadDate'])),
        'likes': json['likes'],
        'userHasLiked': json['userHasLiked'],
        'views': json['views'],
        'moderationTypes': json['moderationTypes'],
    };
}

export function VideoVideoIdGet200ResponseToJSON(json: any): VideoVideoIdGet200Response {
    return VideoVideoIdGet200ResponseToJSONTyped(json, false);
}

export function VideoVideoIdGet200ResponseToJSONTyped(value?: VideoVideoIdGet200Response | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'id': value['id'],
        'userId': value['userId'],
        'title': value['title'],
        'description': value['description'],
        'uploadDate': ((value['uploadDate']).toISOString()),
        'likes': value['likes'],
        'userHasLiked': value['userHasLiked'],
        'views': value['views'],
        'moderationTypes': value['moderationTypes'],
    };
}

