import { GlobalExceptionFilter } from './http-exception.filter'
import {
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ArgumentsHost } from '@nestjs/common'

const mockJson = jest.fn()
const mockStatus = jest.fn().mockReturnValue({ json: mockJson })
const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus })
const mockGetRequest = jest.fn().mockReturnValue({ url: '/test', method: 'GET' })

const mockHost = {
  switchToHttp: () => ({
    getResponse: mockGetResponse,
    getRequest: mockGetRequest,
  }),
} as unknown as ArgumentsHost

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter

  beforeEach(() => {
    filter = new GlobalExceptionFilter()
    jest.clearAllMocks()
  })

  it('returns correct shape for BadRequestException with string message', () => {
    filter.catch(new BadRequestException('Goal title cannot be empty'), mockHost)

    expect(mockStatus).toHaveBeenCalledWith(400)
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Goal title cannot be empty',
        path: '/test',
      }),
    )
  })

  it('returns message array for ValidationPipe errors', () => {
    const validationException = new BadRequestException({
      message: ['title must be a string', 'deadline must be a date'],
      error: 'Bad Request',
    })

    filter.catch(validationException, mockHost)

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['title must be a string', 'deadline must be a date'],
      }),
    )
  })

  it('returns 401 for UnauthorizedException', () => {
    filter.catch(new UnauthorizedException('Invalid credentials'), mockHost)

    expect(mockStatus).toHaveBeenCalledWith(401)
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid credentials',
      }),
    )
  })

  it('returns 404 for NotFoundException', () => {
    filter.catch(new NotFoundException('Goal not found'), mockHost)

    expect(mockStatus).toHaveBeenCalledWith(404)
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        error: 'Not Found',
      }),
    )
  })

  it('returns 500 and hides internals for unhandled exceptions', () => {
    filter.catch(new Error('Database connection lost'), mockHost)

    expect(mockStatus).toHaveBeenCalledWith(500)
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      }),
    )
  })

  it('includes timestamp and path in every response', () => {
    filter.catch(new BadRequestException('test'), mockHost)

    const call = mockJson.mock.calls[0][0]
    expect(call).toHaveProperty('timestamp')
    expect(call).toHaveProperty('path', '/test')
    expect(new Date(call.timestamp).toISOString()).toBe(call.timestamp)
  })
})