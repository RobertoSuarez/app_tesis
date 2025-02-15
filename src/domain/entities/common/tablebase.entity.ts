import {
    CreateDateColumn,
    DeleteDateColumn,
    PrimaryColumn,
    UpdateDateColumn
} from "typeorm";

export class TableBase {

    @PrimaryColumn({ default: () => 'gen_random_uuid()' })
    uid: string;

    @CreateDateColumn({
        name: 'created_at',
        type: 'timestamptz',
        default: () => "CURRENT_TIMESTAMP"
    })
    createdAt: Date;

    @UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamptz',
        default: () => "CURRENT_TIMESTAMP"
    })
    updatedAt: Date;

    @DeleteDateColumn({
        name: 'deleted_at',
        type: 'timestamptz',
        nullable: true  // Se recomienda que sea nullable si aún no se ha eliminado el registro
    })
    deletedAt: Date;
}
