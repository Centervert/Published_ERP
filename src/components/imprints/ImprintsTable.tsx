import { Imprint } from '@/hooks/useImprints';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

interface ImprintsTableProps {
  imprints: Imprint[];
  onEdit: (imprint: Imprint) => void;
  onDelete: (imprint: Imprint) => void;
}

export function ImprintsTable({ imprints, onEdit, onDelete }: ImprintsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Imprint</TableHead>
            <TableHead>From Email</TableHead>
            <TableHead>Colors</TableHead>
            <TableHead>Fonts</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {imprints.map((imprint) => (
            <TableRow key={imprint.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {imprint.logo_url ? (
                    <img 
                      src={imprint.logo_url} 
                      alt={imprint.name}
                      className="h-8 w-8 object-contain rounded"
                    />
                  ) : (
                    <div 
                      className="h-8 w-8 rounded flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: imprint.primary_color }}
                    >
                      {imprint.name.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium">{imprint.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {imprint.from_email}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {[
                    imprint.primary_color,
                    imprint.secondary_color,
                    imprint.accent_color,
                  ].filter(Boolean).map((color, i) => (
                    <div
                      key={i}
                      className="h-5 w-5 rounded border border-border"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {imprint.heading_font}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(imprint)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(imprint)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
