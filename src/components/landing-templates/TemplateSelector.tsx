import React from 'react';
import { landingTemplates, LandingTemplate } from './templateConfigs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  selectedTemplateId: string;
  onSelect: (template: LandingTemplate) => void;
}

const categoryLabels: Record<string, string> = {
  modern: 'Moderno',
  vintage: 'Vintage',
  urban: 'Urbano',
  premium: 'Premium',
  bold: 'Bold',
};

const categoryColors: Record<string, string> = {
  modern: 'bg-blue-500',
  vintage: 'bg-amber-600',
  urban: 'bg-gray-800',
  premium: 'bg-yellow-500',
  bold: 'bg-purple-600',
};

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplateId,
  onSelect,
}) => {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {landingTemplates.map((template) => {
        const isSelected = template.id === selectedTemplateId;
        
        return (
          <Card
            key={template.id}
            className={cn(
              'cursor-pointer transition-all overflow-hidden',
              isSelected 
                ? 'ring-2 ring-primary shadow-lg' 
                : 'hover:shadow-md hover:border-primary/50'
            )}
            onClick={() => onSelect(template)}
          >
            {/* Preview */}
            <div 
              className="aspect-video relative"
              style={{
                background: `linear-gradient(135deg, hsl(${template.defaultConfig.global_styles.primary_color}), hsl(${template.defaultConfig.global_styles.secondary_color}))`,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span 
                  className="text-2xl font-bold text-white opacity-80"
                  style={{ fontFamily: template.defaultConfig.global_styles.font_heading }}
                >
                  {template.name.split(' ')[0]}
                </span>
              </div>
              
              {isSelected && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </div>

            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{template.name}</h3>
                <Badge 
                  variant="secondary" 
                  className={cn('text-white text-xs', categoryColors[template.category])}
                >
                  {categoryLabels[template.category]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {template.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
