import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCommentDto, UpdateCommentDto, ReactToCommentDto } from './dto/comment.dto';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建评论
   */
  async createComment(dto: CreateCommentDto) {
    // 验证市场是否存在
    const market = await this.prisma.market.findUnique({
      where: { id: dto.marketId },
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    // 如果是回复，验证父评论是否存在
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }

      if (parent.marketId !== dto.marketId) {
        throw new ForbiddenException('Parent comment is from a different market');
      }
    }

    return this.prisma.comment.create({
      data: {
        marketId: dto.marketId,
        userAddress: dto.userAddress,
        content: dto.content,
        parentId: dto.parentId,
      },
      include: {
        reactions: true,
      },
    });
  }

  /**
   * 获取市场的所有评论（树状结构）
   */
  async getMarketComments(marketId: string) {
    // 获取所有顶级评论（没有 parentId）
    const topLevelComments = await this.prisma.comment.findMany({
      where: {
        marketId,
        parentId: null,
        isDeleted: false,
      },
      include: {
        reactions: true,
        replies: {
          where: { isDeleted: false },
          include: {
            reactions: true,
            replies: {
              where: { isDeleted: false },
              include: {
                reactions: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return topLevelComments;
  }

  /**
   * 获取单个评论
   */
  async getComment(commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        reactions: true,
        replies: {
          where: { isDeleted: false },
          include: {
            reactions: true,
          },
        },
      },
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  /**
   * 更新评论
   */
  async updateComment(commentId: string, userAddress: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userAddress !== userAddress) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content },
      include: {
        reactions: true,
      },
    });
  }

  /**
   * 删除评论（软删除）
   */
  async deleteComment(commentId: string, userAddress: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userAddress !== userAddress) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        content: '[已删除]',
      },
    });
  }

  /**
   * 对评论进行点赞/踩
   */
  async reactToComment(dto: ReactToCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: dto.commentId },
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment not found');
    }

    // 检查用户是否已经对该评论进行过反应
    const existingReaction = await this.prisma.commentReaction.findUnique({
      where: {
        commentId_userAddress: {
          commentId: dto.commentId,
          userAddress: dto.userAddress,
        },
      },
    });

    // 如果已有反应
    if (existingReaction) {
      // 如果是相同类型，则删除反应（取消）
      if (existingReaction.type === dto.type) {
        await this.prisma.commentReaction.delete({
          where: { id: existingReaction.id },
        });

        // 更新评论的计数
        const updateData = dto.type === 'UPVOTE'
          ? { upvotes: { decrement: 1 } }
          : { downvotes: { decrement: 1 } };

        return this.prisma.comment.update({
          where: { id: dto.commentId },
          data: updateData,
          include: {
            reactions: true,
          },
        });
      } else {
        // 如果是不同类型，则更新反应
        await this.prisma.commentReaction.update({
          where: { id: existingReaction.id },
          data: { type: dto.type },
        });

        // 更新评论的计数（减少旧的，增加新的）
        const oldType = existingReaction.type;
        const updateData = oldType === 'UPVOTE'
          ? { upvotes: { decrement: 1 }, downvotes: { increment: 1 } }
          : { upvotes: { increment: 1 }, downvotes: { decrement: 1 } };

        return this.prisma.comment.update({
          where: { id: dto.commentId },
          data: updateData,
          include: {
            reactions: true,
          },
        });
      }
    }

    // 创建新反应
    await this.prisma.commentReaction.create({
      data: {
        commentId: dto.commentId,
        userAddress: dto.userAddress,
        type: dto.type,
      },
    });

    // 更新评论的计数
    const updateData = dto.type === 'UPVOTE'
      ? { upvotes: { increment: 1 } }
      : { downvotes: { increment: 1 } };

    return this.prisma.comment.update({
      where: { id: dto.commentId },
      data: updateData,
      include: {
        reactions: true,
      },
    });
  }

  /**
   * 获取用户对评论的反应状态
   */
  async getUserReaction(commentId: string, userAddress: string) {
    return this.prisma.commentReaction.findUnique({
      where: {
        commentId_userAddress: {
          commentId,
          userAddress,
        },
      },
    });
  }

  /**
   * 获取用户的所有评论
   */
  async getUserComments(userAddress: string) {
    return this.prisma.comment.findMany({
      where: {
        userAddress,
        isDeleted: false,
      },
      include: {
        market: {
          select: {
            id: true,
            title: true,
          },
        },
        reactions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
