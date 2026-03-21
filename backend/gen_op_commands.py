import sys
import os
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, func, Date, UniqueConstraint, Text
from sqlalchemy.orm import relationship, declarative_base
from app.core.database_initialization import Base
import app.models.model

def print_op_create_table(table):
    print(f"    op.create_table(")
    print(f"        '{table.name}',")
    for col in table.columns:
        # Construct Column representation
        type_str = str(col.type).replace("VARCHAR", "sa.String()").replace("INTEGER", "sa.Integer()").replace("BOOLEAN", "sa.Boolean()").replace("TIMESTAMP", "sa.DateTime()").replace("DATETIME", "sa.DateTime()").replace("TEXT", "sa.Text()").replace("FLOAT", "sa.Float()").replace("DOUBLE PRECISION", "sa.Float()").replace("DATE", "sa.Date()")
        
        # Simple heuristic for common types
        if "(" in type_str: pass
        elif "String" in type_str: type_str = "sa.String()"
        elif "Integer" in type_str: type_str = "sa.Integer()"
        
        args = [f"sa.Column('{col.name}', {type_str})"]
        if col.primary_key: args.append("primary_key=True")
        if not col.nullable: args.append("nullable=False")
        if col.default is not None:
             # We can't easily get the default value as code
             pass
        
        # Foreign Keys
        for fk in col.foreign_keys:
            fk_str = f"sa.ForeignKey('{fk.target_fullname}')"
            if fk.ondelete: fk_str = fk_str[:-1] + f", ondelete='{fk.ondelete}')"
            args.append(fk_str)
            
        print(f"        {', '.join(args)},")
        
    # Unique Constraints
    for const in table.constraints:
        if isinstance(const, UniqueConstraint):
            cols = [f"'{c.name}'" for c in const.columns]
            print(f"        sa.UniqueConstraint({', '.join(cols)}, name='{const.name}'),")
            
    print(f"    )")
    
    # Indexes
    for idx in table.indexes:
        cols = [f"'{c.name}'" for c in idx.columns]
        print(f"    op.create_index(op.f('{idx.name}'), '{table.name}', [{', '.join(cols)}], unique={idx.unique})")

if __name__ == "__main__":
    print("def upgrade():")
    for table in Base.metadata.sorted_tables:
        print_op_create_table(table)
