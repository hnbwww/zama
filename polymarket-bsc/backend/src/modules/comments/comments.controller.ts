import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto, ReactToCommentDto } from './dto/comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * 创建评论
   */
  @Post()
  async createComment(@Body() dto: CreateCommentDto) {
    return this.commentsService.createComment(dto);
  }

  /**
   * 获取市场的所有评论
   */
  @Get('market/:marketId')
  async getMarketComments(@Param('marketId') marketId: string) {
    return this.commentsService.getMarketComments(marketId);
  }

  /**
   * 获取单个评论
   */
  @Get(':commentId')
  async getComment(@Param('commentId') commentId: string) {
    return this.commentsService.getComment(commentId);
  }

  /**
   * 更新评论
   */
  @Put(':commentId')
  async updateComment(
    @Param('commentId') commentId: string,
    @Query('userAddress') userAddress: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.updateComment(commentId, userAddress, dto);
  }

  /**
   * 删除评论
   */
  @Delete(':commentId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @Query('userAddress') userAddress: string,
  ) {
    return this.commentsService.deleteComment(commentId, userAddress);
  }

  /**
   * 对评论进行点赞/踩
   */
  @Post('react')
  async reactToComment(@Body() dto: ReactToCommentDto) {
    return this.commentsService.reactToComment(dto);
  }

  /**
   * 获取用户对评论的反应状态
   */
  @Get(':commentId/user-reaction')
  async getUserReaction(
    @Param('commentId') commentId: string,
    @Query('userAddress') userAddress: string,
  ) {
    return this.commentsService.getUserReaction(commentId, userAddress);
  }

  /**
   * 获取用户的所有评论
   */
  @Get('user/:userAddress')
  async getUserComments(@Param('userAddress') userAddress: string) {
    return this.commentsService.getUserComments(userAddress);
  }
}
