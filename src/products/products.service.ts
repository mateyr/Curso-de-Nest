import { Injectable, Logger } from '@nestjs/common';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common/exceptions';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { DataSource, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { validate as isUUID } from 'uuid';
import { ProductImage } from './entities/product-image.entity';
import { url } from 'inspector';
import { query } from 'express';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto, user: User) {
    try {
      const { images = [], ...productDetails } = createProductDto;

      const product = this.productRepository.create({
        ...productDetails,
        images: images.map((img) =>
          this.productImageRepository.create({ url: img }),
        ),
        user,
      });
      await this.productRepository.save(product);

      return { ...product, images };
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
    });

    return products.map(({ images, ...productDetail }) => ({
      ...productDetail,
      images: images.map((img) => img.url),
    }));
  }

  async findOne(term: string) {
    let product: Product;

    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder('prod');

      product = await queryBuilder
        .where('title ILIKE :title or slug ILIKE :slug', {
          title: term,
          slug: term,
        })
        .leftJoinAndSelect('prod.images', 'prodImages')
        .getOne();
    }

    if (!product) {
      throw new BadRequestException(`Product with ${term} not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {
    // TODO: Implement a better solution
    const { images, ...toUpdate } = updateProductDto;

    const product = await this.productRepository.preload({
      id: id,
      ...toUpdate,
    });

    if (!product) new NotFoundException(`product with id: ${id} not found`);

    // Create query runner
    // ! Se crea el query runner fuera del try catch ya que si sucede algun error se pueda hacer el rollback de la transacción y el release en el catch
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (images) {
        // se puede usar this.productRepository.delete()
        // pero vamos a usar el Query runner
        // vamos a borrar todas las productImages cuya columna productId sea igual al id
        await queryRunner.manager.delete(ProductImage, { product: { id } });

        product.images = images.map((image) =>
          this.productImageRepository.create({ url: image }),
        );
      } else {
        // TODO: Como resolvemos el product.images
      }

      product.user = user;
      await queryRunner.manager.save(product);

      await queryRunner.commitTransaction();

      await queryRunner.release();

      return this.findOnePlain(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();

      this.handleExceptions(err);
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);

    await this.productRepository.remove(product);
  }

  async findOnePlain(term: string) {
    const { images = [], ...productDetail } = await this.findOne(term);
    return {
      ...productDetail,
      images: images.map((img) => img.url),
    };
  }

  private handleExceptions(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');

    try {
      return await query.delete().where({}).execute();
    } catch (error) {
      this.handleExceptions(error);
    }
  }
}
