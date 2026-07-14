import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  Transaction as PublicTransaction,
  TransactionsResponse,
} from '@expence-tracker/shared';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTransactionCommand } from './commands/create-transaction.command';
import { DeleteTransactionCommand } from './commands/delete-transaction.command';
import { UpdateTransactionCommand } from './commands/update-transaction.command';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { GetTransactionsDto } from './dto/get-transactions.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { GetTransactionByIdQuery } from './queries/get-transaction-by-id.query';
import { GetTransactionsQuery } from './queries/get-transactions.query';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransactionDto,
  ): Promise<PublicTransaction> {
    return this.commandBus.execute<CreateTransactionCommand, PublicTransaction>(
      new CreateTransactionCommand(user.userId, dto),
    );
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() dto: GetTransactionsDto,
  ): Promise<TransactionsResponse> {
    return this.queryBus.execute<GetTransactionsQuery, TransactionsResponse>(
      new GetTransactionsQuery(user.userId, dto),
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PublicTransaction> {
    return this.queryBus.execute<GetTransactionByIdQuery, PublicTransaction>(
      new GetTransactionByIdQuery(user.userId, id),
    );
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<PublicTransaction> {
    return this.commandBus.execute<UpdateTransactionCommand, PublicTransaction>(
      new UpdateTransactionCommand(user.userId, id, dto),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.commandBus.execute<DeleteTransactionCommand, void>(
      new DeleteTransactionCommand(user.userId, id),
    );
  }
}
