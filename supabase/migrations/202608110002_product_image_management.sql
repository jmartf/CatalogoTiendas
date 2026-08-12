grant delete on public.product_images to authenticated;

create policy product_images_delete_authorized on public.product_images
for delete to authenticated
using ((select private.can_read_product(product_id)));

comment on policy product_images_delete_authorized on public.product_images is
  'Permite eliminar metadatos solo a usuarios que pueden administrar el producto asociado.';
