import { HttpStatus, Injectable } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { ApiException } from '../common/api-error';

const transitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: ['AWAITING_PAYMENT', 'SUBMITTED', 'CANCELLED'],
  PENDING_PAYMENT: ['DRAFT', 'AWAITING_PAYMENT', 'PAYMENT_PROCESSING', 'SUBMITTED', 'CANCELLED'],
  AWAITING_PAYMENT: ['DRAFT', 'PAYMENT_PROCESSING', 'SUBMITTED', 'CANCELLED'],
  PAYMENT_PROCESSING: ['DRAFT', 'SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['VIEWED', 'SHORTLISTED', 'REJECTED', 'WITHDRAWN', 'CANCELLED'],
  VIEWED: ['SHORTLISTED', 'REJECTED', 'WITHDRAWN', 'CANCELLED'],
  SHORTLISTED: ['VIEWED', 'OFFERED', 'REJECTED', 'WITHDRAWN', 'CANCELLED'],
  OFFERED: ['SHORTLISTED', 'ACCEPTED', 'WITHDRAWN', 'CANCELLED'],
  ACCEPTED: [],
  REJECTED: [],
  WITHDRAWN: [],
  CANCELLED: [],
};

@Injectable()
export class ApplicationStatusService {
  assert(from: ApplicationStatus, to: ApplicationStatus) {
    if (!transitions[from].includes(to)) throw new ApiException(HttpStatus.CONFLICT, 'INVALID_APPLICATION_TRANSITION', `Application cannot move from ${from} to ${to}.`);
  }
  can(from: ApplicationStatus, to: ApplicationStatus) { return transitions[from].includes(to); }
}
