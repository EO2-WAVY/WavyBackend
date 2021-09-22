import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNumber,
    IsNumberString,
    IsOptional,
    IsString,
    IsUrl,
} from 'class-validator';
import { Analysis } from 'src/analyses/entities/analyses.entity';
import { CoreEntity } from 'src/common/entities/core.entity';
import {
    RefVideoDifficultyCode,
    RefVideoSourceCode,
} from 'src/common/enums/code.enum';
import { Practice } from 'src/practices/entities/practice.entity';
import {
    Column,
    Entity,
    JoinTable,
    ManyToMany,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Tag } from '../../tags/entities/tag.entity';

@Entity()
export class RefVideo extends CoreEntity {
    @ApiProperty({ type: String, description: '학습용 동영상 ID' })
    @PrimaryGeneratedColumn({ name: 'rv_seq', type: 'bigint' })
    @IsNumberString()
    rvSeq: string;

    @ApiProperty({
        type: Number,
        description: '학습용 동영상 출처',
    })
    @Column({ name: 'rv_source', type: 'int' })
    @IsNumber()
    rvSource: string;

    @ApiProperty({
        type: String,
        description: '학습용 동영상 출처에서 가져온 제목',
    })
    @Column({ name: 'rv_source_title', type: 'varchar', length: 255 })
    @IsString()
    rvSourceTitle: string;

    @ApiProperty({
        type: String,
        description: '학습용 동영상 출처에서 가져온 계정명',
    })
    @Column({ name: 'rv_source_account_name', type: 'varchar', length: 255 })
    @IsString()
    rvSourceAccountName: string;

    @ApiPropertyOptional({ type: String, description: '학습용 동영상 URL' })
    @Column({ name: 'rv_url', nullable: true, type: 'varchar', length: 255 })
    @IsUrl()
    @IsOptional()
    rvUrl?: string;

    @ApiProperty({ type: String, description: '학습용 동영상 길이' })
    @Column({ name: 'rv_duration', type: 'time' })
    @IsString()
    rvDuration: string;

    @ApiProperty({
        type: Number,
        description: '학습용 동영상 난이도',
    })
    @Column({ name: 'rv_difficulty', type: 'int' })
    @IsNumber()
    rvDifficulty: string;

    @ApiPropertyOptional({ type: String, description: '학습용 동영상 곡명' })
    @Column({
        name: 'rv_song_name',
        nullable: true,
        type: 'varchar',
        length: 255,
    })
    @IsString()
    @IsOptional()
    rvSongName?: string;

    @ApiPropertyOptional({
        type: String,
        description: '학습용 동영상 아티스트명',
    })
    @Column({
        name: 'rv_artist_name',
        nullable: true,
        type: 'varchar',
        length: 255,
    })
    @IsString()
    @IsOptional()
    rvArtistName?: string;

    @OneToMany((type) => Analysis, (analysis) => analysis.refVideo)
    analyses: Analysis[];

    @OneToMany((type) => Practice, (practice) => practice.refVideo)
    practices: Practice[];

    @ManyToMany((type) => Tag)
    @JoinTable({
        name: 'ref_videos_tags',
        joinColumn: {
            name: 'rv_seq',
            referencedColumnName: 'rvSeq',
        },
        inverseJoinColumn: {
            name: 'tag_seq',
            referencedColumnName: 'tagSeq',
        },
    })
    tags: Tag[];
}
