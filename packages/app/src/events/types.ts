/**
 * This module contains generic resource and event type definitions
 * to make it easier to compose new webhook and API definitions when
 * required.
 */

import {ProbotOctokit, Logger} from 'probot';

/**
 * The supported signal types (see https://nodejs.org/api/process.html#signal-events)
 * for triggering a halt.
 */
export type SignalType = 'SIGINT' | 'SIGTERM';

/**
 * Interface to avoid TS2590 when loading the reviewing team
 */
export interface OctokitContext {
  octokit: InstanceType<typeof ProbotOctokit>;
  log: Logger;
}

/**
 * Represents a GitHub resource
 */
export interface GitHubResource {
  /** The numberic identifier */
  id: number;

  /** The node identifier */
  node_id: string;
}

/**
 * A resource representing a user/organization/bot that
 * can own another resource
 */
export interface OwnerResource extends GitHubResource {
  /** The name of the owner */
  login: string;

  /** Indicates whether the owner is a site admin */
  site_admin: boolean;

  /** The type of user */
  type: 'Bot' | 'User' | 'Organization';
}

/** A resource representing an organization */
export interface OrganizationResource extends GitHubResource {
  /** The organization name */
  name: string;
}

/** Resource representing a repository */
export interface RepositoryResource extends GitHubResource {
  /** Name of the repository */
  name: string;

  /** Repository owner and name */
  full_name: string;

  /** The user or organization that owns the repository */
  owner: OwnerResource;
}

/** A generic definition for a web hook event */
export interface WebhookEvent {
  /** The action name  */
  action: string;
  sender: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  installation: GitHubResource;
}

/** An event generated by or targeting an organization */
export interface OrganizationWebhookEvent extends WebhookEvent {
  organization: OrganizationResource;
}

/** An event generated by or targeting a repository */
export interface RepositoryWebhookEvent extends WebhookEvent {
  repository: RepositoryResource;
  organization?: OrganizationResource;
}

/** An event raised by a Dependabot alert */
export interface DependabotAlertWebhookEvent extends RepositoryWebhookEvent {
  alert: {
    dismissed_by?: OwnerResource;
    number: number;
  };
}

/**
 * Context for processing manually defined event types.
 */
export interface CustomWebhookEventContext<
  T extends WebhookEvent = WebhookEvent
> {
  id: string;
  name: string;
  octokit: InstanceType<typeof ProbotOctokit>;
  log: Logger;
  payload: T;
}

/**
 * Context for code scanning alert rules
 */
export interface CodeScanningSecurityRule {
  id: string;
  severity: string;
  description: string;
  name: string;
  security_severity_level: string;
}
