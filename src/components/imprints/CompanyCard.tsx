import { Company } from '@/hooks/useCompany';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Edit, Globe, Phone, MapPin } from 'lucide-react';

interface CompanyCardProps {
  company: Company;
  onEdit: () => void;
}

export function CompanyCard({ company, onEdit }: CompanyCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Prefer icon (square) over logo (horizontal) for this compact display */}
            {company.icon_url ? (
              <img 
                src={company.icon_url} 
                alt={company.name} 
                className="h-12 w-12 object-contain rounded"
              />
            ) : company.logo_url ? (
              <img 
                src={company.logo_url} 
                alt={company.name} 
                className="h-12 max-w-[120px] object-contain"
              />
            ) : (
              <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg">{company.name}</CardTitle>
              <CardDescription>Parent Company</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {company.website_url && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4" />
              <a 
                href={company.website_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-foreground hover:underline"
              >
                {company.website_url.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {company.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{company.phone}</span>
            </div>
          )}
          {company.legal_address && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="line-clamp-1">{company.legal_address}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
